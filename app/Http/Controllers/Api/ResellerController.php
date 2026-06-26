<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\UserResource;
use App\Models\Plan;
use App\Models\ResellerSetting;
use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ResellerController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PlanService $planService
    ) {}

    /**
     * Get reseller dashboard stats.
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->role === 'super_admin';

        // Base query: reseller sees their own users, super_admin sees all
        $usersQuery = $isSuperAdmin
            ? User::where('role', 'user')
            : User::where('reseller_id', $user->id);

        $totalUsers = (clone $usersQuery)->count();

        // Active users: those with an active or trial subscription
        $activeUsers = (clone $usersQuery)
            ->whereHas('subscriptions', function ($q) {
                $q->whereIn('status', ['active', 'trial'])
                    ->where('ends_at', '>', Carbon::now());
            })->count();

        // Revenue this month from subscription amounts
        $subscriptionQuery = $isSuperAdmin
            ? Subscription::query()
            : Subscription::whereIn('user_id', (clone $usersQuery)->pluck('id'));

        $revenueThisMonth = (clone $subscriptionQuery)
            ->where('status', 'active')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('amount_paid');

        // Credit balance (reseller only)
        $creditBalance = 0;
        if (!$isSuperAdmin) {
            $resellerSetting = $user->resellerSetting;
            $creditBalance = $resellerSetting?->credit_balance ?? 0;
        }

        // Users grouped by plan
        $usersByPlan = [];
        $plans = Plan::where('is_active', true)->get();
        foreach ($plans as $plan) {
            $usersByPlan[$plan->slug] = (clone $usersQuery)
                ->where('plan_id', $plan->id)
                ->count();
        }

        // Count users with no plan
        $usersByPlan['none'] = (clone $usersQuery)
            ->whereNull('plan_id')
            ->count();

        return $this->success([
            'total_users' => $totalUsers,
            'active_users' => $activeUsers,
            'total_revenue_this_month' => round((float) $revenueThisMonth, 2),
            'credit_balance' => round((float) $creditBalance, 2),
            'users_by_plan' => $usersByPlan,
        ], 'Reseller dashboard retrieved successfully.');
    }

    /**
     * List users belonging to this reseller.
     */
    public function users(Request $request)
    {
        $authUser = $request->user();

        $query = $authUser->role === 'super_admin'
            ? User::where('role', 'user')
            : User::where('reseller_id', $authUser->id);

        // Filters
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($planId = $request->input('plan_id')) {
            $query->where('plan_id', $planId);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->with(['plan'])
            ->withCount('whatsappInstances')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return $this->paginated($users, 'Users retrieved successfully.');
    }

    /**
     * Create a new user under this reseller.
     */
    public function createUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'plan_id' => 'required|exists:plans,id',
            'trial_days' => 'nullable|integer|min:0',
        ]);

        $authUser = $request->user();
        $plan = Plan::findOrFail($validated['plan_id']);

        // Create the user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'user',
            'reseller_id' => $authUser->role === 'reseller' ? $authUser->id : null,
            'plan_id' => $plan->id,
            'is_active' => true,
        ]);

        // Create subscription
        $trialDays = $validated['trial_days'] ?? null;

        if ($trialDays !== null && $trialDays > 0) {
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'status' => 'trial',
                'billing_cycle' => 'monthly',
                'amount_paid' => 0,
                'starts_at' => Carbon::now(),
                'ends_at' => Carbon::now()->addDays($trialDays),
                'payment_method' => 'reseller',
            ]);

            $user->update(['trial_ends_at' => Carbon::now()->addDays($trialDays)]);
        } else {
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'billing_cycle' => 'monthly',
                'amount_paid' => $plan->price_monthly,
                'starts_at' => Carbon::now(),
                'ends_at' => Carbon::now()->addDays(30),
                'payment_method' => 'reseller',
            ]);
        }

        $user->load('plan');

        return $this->success([
            'user' => new UserResource($user),
            'credentials' => [
                'email' => $user->email,
                'password' => $validated['password'], // Show password once
            ],
            'subscription' => new SubscriptionResource($subscription->load('plan')),
        ], 'User created successfully.', 201);
    }

    /**
     * Update an existing user.
     */
    public function updateUser(Request $request, $id)
    {
        $authUser = $request->user();
        $user = User::findOrFail($id);

        // Validate ownership
        if ($authUser->role === 'reseller' && $user->reseller_id !== $authUser->id) {
            return $this->error('You do not have permission to update this user.', 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'is_active' => 'sometimes|boolean',
            'plan_id' => 'sometimes|exists:plans,id',
        ]);

        // If plan changed, update subscription too
        if (isset($validated['plan_id']) && $validated['plan_id'] != $user->plan_id) {
            $newPlan = Plan::findOrFail($validated['plan_id']);

            // Create new subscription
            Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $newPlan->id,
                'status' => 'active',
                'billing_cycle' => 'monthly',
                'amount_paid' => $newPlan->price_monthly,
                'starts_at' => Carbon::now(),
                'ends_at' => Carbon::now()->addDays(30),
                'payment_method' => 'reseller',
            ]);
        }

        $user->update($validated);
        $user->load('plan');

        return $this->success(
            new UserResource($user),
            'User updated successfully.'
        );
    }

    /**
     * Toggle a user's active status.
     */
    public function toggleUserStatus(Request $request, $id)
    {
        $authUser = $request->user();
        $user = User::findOrFail($id);

        // Validate ownership
        if ($authUser->role === 'reseller' && $user->reseller_id !== $authUser->id) {
            return $this->error('You do not have permission to modify this user.', 403);
        }

        $user->update(['is_active' => !$user->is_active]);

        // If deactivating, revoke all Sanctum tokens
        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        return $this->success([
            'is_active' => $user->is_active,
        ], $user->is_active ? 'User activated.' : 'User deactivated.');
    }

    /**
     * Assign a plan to a user.
     */
    public function assignPlan(Request $request, $id)
    {
        $authUser = $request->user();
        $user = User::findOrFail($id);

        // Validate ownership
        if ($authUser->role === 'reseller' && $user->reseller_id !== $authUser->id) {
            return $this->error('You do not have permission to modify this user.', 403);
        }

        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'nullable|in:monthly,yearly',
        ]);

        $plan = Plan::findOrFail($validated['plan_id']);
        $billingCycle = $validated['billing_cycle'] ?? 'monthly';

        $endsAt = $billingCycle === 'yearly'
            ? Carbon::now()->addDays(365)
            : Carbon::now()->addDays(30);

        $amount = $billingCycle === 'yearly'
            ? $plan->price_yearly
            : $plan->price_monthly;

        // Create new subscription
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'billing_cycle' => $billingCycle,
            'amount_paid' => $amount,
            'starts_at' => Carbon::now(),
            'ends_at' => $endsAt,
            'payment_method' => 'reseller',
        ]);

        $user->update(['plan_id' => $plan->id]);

        return $this->success(
            new SubscriptionResource($subscription->load('plan')),
            'Plan assigned successfully.'
        );
    }

    /**
     * Get or update reseller settings.
     */
    public function resellerSettings(Request $request)
    {
        $user = $request->user();

        if ($request->isMethod('get')) {
            $settings = $user->resellerSetting;

            if (!$settings) {
                return $this->success(null, 'No reseller settings found.');
            }

            return $this->success($settings, 'Reseller settings retrieved.');
        }

        // POST: update or create
        $validated = $request->validate([
            'business_name' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string|url|max:500',
            'custom_domain' => 'nullable|string|max:255',
            'primary_color' => 'nullable|string|max:7',
            'support_email' => 'nullable|string|email|max:255',
            'support_phone' => 'nullable|string|max:20',
            'markup_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $settings = ResellerSetting::updateOrCreate(
            ['user_id' => $user->id],
            $validated
        );

        return $this->success($settings, 'Reseller settings updated successfully.');
    }
}
