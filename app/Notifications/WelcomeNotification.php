<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class WelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // For now, just log — don't actually send email
        Log::info('WelcomeNotification triggered for user: ' . $notifiable->id, [
            'name' => $notifiable->name,
            'email' => $notifiable->email,
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

        return (new MailMessage)
            ->subject("Welcome to {$appName}!")
            ->greeting("Hello {$notifiable->name}!")
            ->line("Welcome to {$appName} — your WhatsApp automation platform.")
            ->line('Your account has been successfully created.')
            ->action('Get Started', config('wasp.app_url'))
            ->line('If you have any questions, feel free to reach out to our support team.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'welcome',
            'message' => 'Welcome to ' . config('wasp.app_name', 'WASp') . '!',
        ];
    }
}
