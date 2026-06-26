<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class PlanExpiringNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Subscription $subscription,
        public int $daysRemaining = 3
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        Log::info('PlanExpiringNotification triggered for user: ' . $notifiable->id, [
            'subscription_id' => $this->subscription->id,
            'days_remaining' => $this->daysRemaining,
            'ends_at' => $this->subscription->ends_at?->toIso8601String(),
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
            ->subject("Your {$planName} Plan Expires in {$this->daysRemaining} Days — {$appName}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("Your **{$planName}** plan is expiring in **{$this->daysRemaining} days**.")
            ->line('Expiry date: ' . ($this->subscription->ends_at?->format('M d, Y') ?? 'N/A'))
            ->line('Renew now to avoid any interruption in service.')
            ->action('Renew Plan', config('wasp.app_url') . '/billing/plans')
            ->line('If you have any questions, contact our support team.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'plan_expiring',
            'subscription_id' => $this->subscription->id,
            'days_remaining' => $this->daysRemaining,
            'plan_name' => $this->subscription->plan?->name,
            'message' => "Your plan expires in {$this->daysRemaining} days.",
        ];
    }
}
