<?php

namespace App\Jobs;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSubscriptionConfirmationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Subscription $subscription
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info("Subscription confirmed for user: {$this->subscription->user_id}", [
            'subscription_id' => $this->subscription->id,
            'plan_id' => $this->subscription->plan_id,
            'status' => $this->subscription->status,
            'billing_cycle' => $this->subscription->billing_cycle,
            'amount_paid' => $this->subscription->amount_paid,
            'ends_at' => $this->subscription->ends_at?->toIso8601String(),
        ]);

        // TODO: Integrate with email service to send actual confirmation email
        // TODO: Integrate with Razorpay for payment processing
    }
}
