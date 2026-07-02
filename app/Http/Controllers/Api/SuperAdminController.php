<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\UserResource;
use App\Models\MessageLog;
use App\Models\Plan;
use App\Models\ResellerSetting;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WhatsappInstance;
use App\Services\PlanService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SuperAdminController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PlanService $planService
    ) {}

    /**
     * Get platform-wide statistics.
     */
    public function platformStats()
    {
        $totalUsers = User::where('role', 'user')->count();

        $activeUsers = User::where('role', 'user')
            ->whereHas('subscriptions', function ($q) {
                $q->whereIn('status', ['active', 'trial'])
                    ->where('ends_at', '>', Carbon::now());
            })->count();

        $totalResellers = User::where('role', 'reseller')->count();
        $totalInstances = WhatsappInstance::count();
        $connectedInstances = WhatsappInstance::where('status', 'connected')->count();

        $totalMessagesSentToday = (int) WhatsappInstance::sum('messages_sent_today');
        $totalMessagesSentThisMonth = (int) WhatsappInstance::sum('messages_sent_this_month');

        $revenueThisMonth = Subscription::where('status', 'active')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('amount_paid');

        // Plans breakdown
        $plansBreakdown = [];
        $plans = Plan::where('is_active', true)->get();
        foreach ($plans as $plan) {
            $plansBreakdown[$plan->slug] = User::where('role', 'user')
                ->where('plan_id', $plan->id)
                ->count();
        }

        $newUsersThisWeek = User::where('role', 'user')
            ->where('created_at', '>=', Carbon::now()->subWeek())
            ->count();

        return $this->success([
            'total_users' => $totalUsers,
            'active_users' => $activeUsers,
            'total_resellers' => $totalResellers,
            'total_instances' => $totalInstances,
            'connected_instances' => $connectedInstances,
            'total_messages_sent_today' => $totalMessagesSentToday,
            'total_messages_sent_this_month' => $totalMessagesSentThisMonth,
            'revenue_this_month' => round((float) $revenueThisMonth, 2),
            'plans_breakdown' => $plansBreakdown,
            'new_users_this_week' => $newUsersThisWeek,
        ], 'Platform stats retrieved successfully.');
    }

    /**
     * List all resellers.
     */
    public function resellers(Request $request)
    {
        $resellers = User::where('role', 'reseller')
            ->with('resellerSetting')
            ->withCount('clients')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        // Add computed revenue for each reseller
        $resellers->getCollection()->transform(function ($reseller) {
            $clientIds = $reseller->clients()->pluck('id');

            $reseller->revenue_this_month = Subscription::whereIn('user_id', $clientIds)
                ->where('status', 'active')
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->sum('amount_paid');

            $reseller->credit_balance = $reseller->resellerSetting?->credit_balance ?? 0;
            $reseller->business_name = $reseller->resellerSetting?->business_name;

            return $reseller;
        });

        return $this->paginated($resellers, 'Resellers retrieved successfully.');
    }

    /**
     * List ALL users across all resellers.
     */
    public function allUsers(Request $request)
    {
        $query = User::query();

        // Filters
        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        if ($planId = $request->input('plan_id')) {
            $query->where('plan_id', $planId);
        }

        if ($resellerId = $request->input('reseller_id')) {
            $query->where('reseller_id', $resellerId);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->with(['plan', 'reseller'])
            ->withCount('whatsappInstances')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return $this->paginated($users, 'Users retrieved successfully.');
    }

    /**
     * Create a new reseller.
     */
    public function createReseller(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'business_name' => 'nullable|string|max:255',
            'plan_id' => 'required|exists:plans,id',
        ]);

        $plan = Plan::findOrFail($validated['plan_id']);

        // Create the reseller user
        $reseller = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'reseller',
            'plan_id' => $plan->id,
            'is_active' => true,
        ]);

        // Create subscription
        $subscription = Subscription::create([
            'user_id' => $reseller->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'amount_paid' => $plan->price_monthly,
            'starts_at' => Carbon::now(),
            'ends_at' => Carbon::now()->addDays(30),
            'payment_method' => 'admin',
        ]);

        // Create reseller settings
        ResellerSetting::create([
            'user_id' => $reseller->id,
            'business_name' => $validated['business_name'] ?? $validated['name'],
            'credit_balance' => 0,
        ]);

        $reseller->load(['plan', 'resellerSetting']);

        return $this->success([
            'reseller' => new UserResource($reseller),
            'credentials' => [
                'email' => $reseller->email,
                'password' => $validated['password'],
            ],
            'subscription' => new SubscriptionResource($subscription->load('plan')),
            'settings' => $reseller->resellerSetting,
        ], 'Reseller created successfully.', 201);
    }

    /**
     * Super admin can update ANY user.
     */
    public function manageUser($id, Request $request)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'is_active' => 'sometimes|boolean',
            'plan_id' => 'sometimes|exists:plans,id',
            'role' => 'sometimes|in:user,reseller,super_admin',
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
        ]);

        // If plan changed, create new subscription
        if (isset($validated['plan_id']) && $validated['plan_id'] != $user->plan_id) {
            $newPlan = Plan::findOrFail($validated['plan_id']);

            Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $newPlan->id,
                'status' => 'active',
                'billing_cycle' => 'monthly',
                'amount_paid' => $newPlan->price_monthly,
                'starts_at' => Carbon::now(),
                'ends_at' => Carbon::now()->addDays(30),
                'payment_method' => 'admin',
            ]);
        }

        // If deactivating, revoke all tokens
        if (isset($validated['is_active']) && !$validated['is_active']) {
            $user->tokens()->delete();
        }

        $user->update($validated);
        $user->load('plan');

        return $this->success(
            new UserResource($user),
            'User updated successfully.'
        );
    }

    /**
     * Add credits to a reseller's balance.
     */
    public function addResellerCredits(Request $request, $id)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $reseller = User::where('role', 'reseller')->findOrFail($id);

        $settings = ResellerSetting::firstOrCreate(
            ['user_id' => $reseller->id],
            ['business_name' => $reseller->name, 'credit_balance' => 0]
        );

        $settings->increment('credit_balance', $validated['amount']);

        return $this->success([
            'reseller_id' => $reseller->id,
            'credit_balance' => round((float) $settings->fresh()->credit_balance, 2),
            'amount_added' => round((float) $validated['amount'], 2),
        ], 'Credits added successfully.');
    }

    /**
     * Get or update global platform settings.
     */
    public function globalSettings(Request $request)
    {
        if ($request->isMethod('get')) {
            return $this->success([
                'allow_registration' => config('wasp.allow_registration', true),
                'trial_days' => config('wasp.trial_days', 7),
                'app_name' => config('wasp.app_name', 'WASp'),
                'app_url' => config('wasp.app_url'),
                'node_service_url' => config('wasp.node_service_url'),
                'warmup_days' => config('wasp.warmup_days'),
                'message_delay_min' => config('wasp.message_delay_min'),
                'message_delay_max' => config('wasp.message_delay_max'),
                'max_bulk_contacts' => config('wasp.max_bulk_contacts'),
            ], 'Global settings retrieved.');
        }

        // POST: For now, settings are config-driven.
        // In production, these would be stored in a settings table.
        $validated = $request->validate([
            'allow_registration' => 'sometimes|boolean',
            'trial_days' => 'sometimes|integer|min:0',
            'app_name' => 'sometimes|string|max:255',
        ]);

        // Note: In production, store these in a `settings` database table.
        // For now, we acknowledge the request and return the submitted values.
        return $this->success(
            $validated,
            'Settings update acknowledged. Note: Config-based settings require .env updates in the current implementation.'
        );
    }

    /**
     * Impersonate a user (generate Sanctum token for them).
     */
    public function impersonate($id)
    {
        $user = User::findOrFail($id);

        $token = $user->createToken('impersonation')->plainTextToken;

        return $this->success([
            'token' => $token,
            'user' => new UserResource($user),
        ], 'Impersonating user: ' . $user->name);
    }
}
