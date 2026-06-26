<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WhatsappInstance;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PlanService
{
    /**
     * Get user's active subscription and plan.
     * Returns null if no active subscription.
     */
    public function getActivePlan(User $user): ?Plan
    {
        $subscription = $this->getActiveSubscription($user);

        if (!$subscription) {
            return null;
        }

        return $subscription->plan;
    }

    /**
     * Get user's active subscription.
     */
    public function getActiveSubscription(User $user): ?Subscription
    {
        return $user->subscriptions()
            ->where(function ($query) {
                $query->where('status', 'active')
                    ->orWhere(function ($q) {
                        $q->where('status', 'trial')
                            ->where('ends_at', '>', Carbon::now());
                    });
            })
            ->where('ends_at', '>', Carbon::now())
            ->latest('created_at')
            ->with('plan')
            ->first();
    }

    /**
     * Check if user has an active subscription.
     * (status = active OR trial and trial_ends_at > now)
     */
    public function hasActivePlan(User $user): bool
    {
        // Super admins and resellers always have active plans
        if (in_array($user->role, ['super_admin', 'reseller'])) {
            return true;
        }

        return $this->getActiveSubscription($user) !== null;
    }

    /**
     * Check if user can create another WhatsApp instance.
     * Compare: user's instance count vs plan max_instances.
     */
    public function canAddInstance(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        if (!$plan) {
            return false;
        }

        if ($plan->max_instances === -1) {
            return true;
        }

        $currentCount = $user->whatsappInstances()->count();

        return $currentCount < $plan->max_instances;
    }

    /**
     * Check if user can send more messages this month.
     * Compare: sum of messages_sent_this_month across all
     * user's instances vs plan max_messages_per_month.
     * -1 = unlimited.
     */
    public function canSendMessages(User $user, int $count = 1): bool
    {
        $plan = $this->getActivePlan($user);

        if (!$plan) {
            return false;
        }

        if ($plan->max_messages_per_month === -1) {
            return true;
        }

        $currentCount = $user->whatsappInstances()->sum('messages_sent_this_month');

        return ($currentCount + $count) <= $plan->max_messages_per_month;
    }

    /**
     * Check if user can add more contacts.
     * Compare: user's total contact count vs plan max_contacts.
     * -1 = unlimited.
     */
    public function canAddContacts(User $user, int $count = 1): bool
    {
        $plan = $this->getActivePlan($user);

        if (!$plan) {
            return false;
        }

        if ($plan->max_contacts === -1) {
            return true;
        }

        $currentCount = $user->contacts()->count();

        return ($currentCount + $count) <= $plan->max_contacts;
    }

    /**
     * Check if user can create more drip sequences.
     * Compare: user's sequence count vs plan max_drip_sequences.
     * -1 = unlimited, 0 = not allowed.
     */
    public function canAddDripSequence(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        if (!$plan) {
            return false;
        }

        if ($plan->max_drip_sequences === 0) {
            return false;
        }

        if ($plan->max_drip_sequences === -1) {
            return true;
        }

        $currentCount = $user->dripSequences()->count();

        return $currentCount < $plan->max_drip_sequences;
    }

    /**
     * Check if user can create more chatbot flows.
     */
    public function canAddChatbotFlow(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        if (!$plan) {
            return false;
        }

        if ($plan->max_chatbot_flows === 0) {
            return false;
        }

        if ($plan->max_chatbot_flows === -1) {
            return true;
        }

        $currentCount = $user->chatbotFlows()->count();

        return $currentCount < $plan->max_chatbot_flows;
    }

    /**
     * Check if user's plan includes AI chatbot.
     */
    public function canUseAiChatbot(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        return $plan ? (bool) $plan->can_use_ai_chatbot : false;
    }

    /**
     * Check if user's plan includes groups management.
     */
    public function canUseGroups(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        return $plan ? (bool) $plan->can_use_groups : false;
    }

    /**
     * Check if user's plan includes number warmer.
     */
    public function canUseWarmer(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        return $plan ? (bool) $plan->can_use_warmer : false;
    }

    /**
     * Check if user's plan includes API access.
     */
    public function canUseApi(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        return $plan ? (bool) $plan->can_use_api : false;
    }

    /**
     * Check if user's plan includes white label.
     */
    public function canWhiteLabel(User $user): bool
    {
        $plan = $this->getActivePlan($user);

        return $plan ? (bool) $plan->can_white_label : false;
    }

    /**
     * Get usage summary for a user.
     * Returns array with current usage vs limits.
     */
    public function getUsageSummary(User $user): array
    {
        $subscription = $this->getActiveSubscription($user);
        $plan = $subscription?->plan;

        if (!$plan) {
            return [
                'instances' => ['used' => 0, 'limit' => 0, 'percentage' => 0],
                'messages' => ['used' => 0, 'limit' => 0, 'percentage' => 0],
                'contacts' => ['used' => 0, 'limit' => 0, 'percentage' => 0],
                'drip_sequences' => ['used' => 0, 'limit' => 0, 'percentage' => 0],
                'chatbot_flows' => ['used' => 0, 'limit' => 0, 'percentage' => 0],
                'days_remaining' => 0,
                'plan_name' => 'None',
                'status' => 'inactive',
            ];
        }

        $instancesUsed = $user->whatsappInstances()->count();
        $messagesUsed = (int) $user->whatsappInstances()->sum('messages_sent_this_month');
        $contactsUsed = $user->contacts()->count();
        $dripUsed = $user->dripSequences()->count();
        $chatbotUsed = $user->chatbotFlows()->count();

        $daysRemaining = $subscription->ends_at
            ? max(0, (int) Carbon::now()->diffInDays($subscription->ends_at, false))
            : 0;

        return [
            'instances' => [
                'used' => $instancesUsed,
                'limit' => $plan->max_instances,
                'percentage' => $this->calcPercentage($instancesUsed, $plan->max_instances),
            ],
            'messages' => [
                'used' => $messagesUsed,
                'limit' => $plan->max_messages_per_month,
                'percentage' => $this->calcPercentage($messagesUsed, $plan->max_messages_per_month),
            ],
            'contacts' => [
                'used' => $contactsUsed,
                'limit' => $plan->max_contacts,
                'percentage' => $this->calcPercentage($contactsUsed, $plan->max_contacts),
            ],
            'drip_sequences' => [
                'used' => $dripUsed,
                'limit' => $plan->max_drip_sequences,
                'percentage' => $this->calcPercentage($dripUsed, $plan->max_drip_sequences),
            ],
            'chatbot_flows' => [
                'used' => $chatbotUsed,
                'limit' => $plan->max_chatbot_flows,
                'percentage' => $this->calcPercentage($chatbotUsed, $plan->max_chatbot_flows),
            ],
            'days_remaining' => $daysRemaining,
            'plan_name' => $plan->name,
            'status' => $subscription->status,
        ];
    }

    /**
     * Calculate usage percentage.
     * Returns 0 for unlimited (-1) limits.
     */
    private function calcPercentage(int $used, int $limit): int
    {
        if ($limit <= 0) {
            return 0;
        }

        return min(100, (int) round(($used / $limit) * 100));
    }

    /**
     * Reset monthly message counts for all instances.
     * Called by scheduler on 1st of each month.
     */
    public function resetMonthlyMessageCounts(): void
    {
        WhatsappInstance::query()->update(['messages_sent_this_month' => 0]);

        Log::info('Monthly message counts have been reset for all instances.');
    }

    /**
     * Check if subscription is expired and update status.
     */
    public function checkAndExpireSubscriptions(): void
    {
        $expired = Subscription::whereIn('status', ['active', 'trial'])
            ->where('ends_at', '<', Carbon::now())
            ->get();

        foreach ($expired as $subscription) {
            $subscription->update(['status' => 'expired']);

            Log::info("Subscription #{$subscription->id} expired for user #{$subscription->user_id}.");
        }

        if ($expired->count() > 0) {
            Log::info("Total subscriptions expired: {$expired->count()}");
        }
    }
}
