<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlanResource;
use App\Http\Resources\SubscriptionResource;
use App\Jobs\SendSubscriptionConfirmationJob;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\PlanService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BillingController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PlanService $planService
    ) {}

    /**
     * List all available plans.
     */
    public function plans(Request $request)
    {
        $query = Plan::where('is_active', true);

        // If the caller is a reseller or super_admin, show all plans
        // Otherwise, only show public plans
        $user = $request->user();
        if (!$user || !in_array($user->role, ['reseller', 'super_admin'])) {
            $query->where('is_public', true);
        }

        $plans = $query->orderBy('price_monthly', 'asc')->get();

        return $this->success(
            PlanResource::collection($plans),
            'Plans retrieved successfully.'
        );
    }

    /**
     * Get the current user's active subscription.
     */
    public function currentSubscription(Request $request)
    {
        $user = $request->user();
        $subscription = $this->planService->getActiveSubscription($user);

        if (!$subscription) {
            return $this->error('No active subscription found.', 404);
        }

        $subscription->load('plan');
        $usageSummary = $this->planService->getUsageSummary($user);

        return $this->success([
            'subscription' => new SubscriptionResource($subscription),
            'usage_summary' => $usageSummary,
        ], 'Subscription retrieved successfully.');
    }

    /**
     * Subscribe to a plan.
     */
    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'payment_reference' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $plan = Plan::findOrFail($validated['plan_id']);

        // Check if the plan is active
        if (!$plan->is_active) {
            return $this->error('This plan is not currently available.', 422);
        }

        // Check if user already has an active subscription
        $existingSubscription = $this->planService->getActiveSubscription($user);
        if ($existingSubscription) {
            return $this->error(
                'You already have an active subscription. Cancel it first or wait for it to expire.',
                422
            );
        }

        // Calculate amount and end date
        $amount = $validated['billing_cycle'] === 'yearly'
            ? $plan->price_yearly
            : $plan->price_monthly;

        $endsAt = $validated['billing_cycle'] === 'yearly'
            ? Carbon::now()->addDays(365)
            : Carbon::now()->addDays(30);

        // Create subscription
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'billing_cycle' => $validated['billing_cycle'],
            'amount_paid' => $amount,
            'starts_at' => Carbon::now(),
            'ends_at' => $endsAt,
            'payment_method' => 'manual',
            'payment_reference' => $validated['payment_reference'] ?? null,
        ]);

        // Update user's plan
        $user->update(['plan_id' => $plan->id]);

        $subscription->load('plan');

        // Log the subscription
        Log::info("New subscription created", [
            'user_id' => $user->id,
            'plan' => $plan->name,
            'billing_cycle' => $validated['billing_cycle'],
            'amount' => $amount,
        ]);

        // Dispatch confirmation job
        SendSubscriptionConfirmationJob::dispatch($subscription);

        return $this->success(
            new SubscriptionResource($subscription),
            'Subscription created successfully.',
            201
        );
    }

    /**
     * Cancel the current subscription.
     */
    public function cancel(Request $request)
    {
        $user = $request->user();
        $subscription = $this->planService->getActiveSubscription($user);

        if (!$subscription) {
            return $this->error('No active subscription to cancel.', 404);
        }

        $subscription->update([
            'cancelled_at' => Carbon::now(),
            'status' => 'cancelled',
        ]);

        $endsAt = $subscription->ends_at?->format('M d, Y') ?? 'N/A';

        return $this->success([
            'subscription' => new SubscriptionResource($subscription->fresh('plan')),
        ], "Subscription cancelled. You have access until {$endsAt}.");
    }

    /**
     * Get the user's usage summary.
     */
    public function usageSummary(Request $request)
    {
        $usageSummary = $this->planService->getUsageSummary($request->user());

        return $this->success($usageSummary, 'Usage summary retrieved successfully.');
    }

    /**
     * Get the user's subscription history (invoices).
     */
    public function invoices(Request $request)
    {
        $subscriptions = $request->user()
            ->subscriptions()
            ->with('plan')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return $this->paginated($subscriptions, 'Invoices retrieved successfully.');
    }
}
