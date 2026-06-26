<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class SubscriptionConfirmedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Subscription $subscription
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        Log::info('SubscriptionConfirmedNotification triggered for user: ' . $notifiable->id, [
            'subscription_id' => $this->subscription->id,
            'plan_id' => $this->subscription->plan_id,
            'status' => $this->subscription->status,
        ]);

        return [];
    }

    /**
     * Get the mail representation of the notification.
     * Placeholder — will be used when email sending is enabled.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('wasp.app_name', 'WASp');
        $planName = $this->subscription->plan?->name ?? 'Unknown';

        return (new MailMessage)
            ->subject("Subscription Confirmed — {$appName}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("Your subscription to the **{$planName}** plan has been confirmed.")
            ->line('Billing cycle: ' . ucfirst($this->subscription->billing_cycle ?? 'N/A'))
            ->line('Valid until: ' . ($this->subscription->ends_at?->format('M d, Y') ?? 'N/A'))
            ->action('View Dashboard', config('wasp.app_url'))
            ->line('Thank you for choosing ' . $appName . '!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'subscription_confirmed',
            'subscription_id' => $this->subscription->id,
            'plan_name' => $this->subscription->plan?->name,
            'message' => 'Your subscription has been confirmed.',
        ];
    }
}
