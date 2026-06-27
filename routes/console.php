<?php

use App\Services\PlanService;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| WASp scheduled tasks for subscription management and usage tracking.
|
*/

// Reset monthly message counts on 1st of each month at midnight
Schedule::call(function () {
    app(PlanService::class)->resetMonthlyMessageCounts();
})->monthlyOn(1, '00:00')->name('reset-monthly-counts');

// Check and expire subscriptions daily at midnight
Schedule::call(function () {
    app(PlanService::class)->checkAndExpireSubscriptions();
})->daily()->name('expire-subscriptions');

// Reset daily message counts per instance at midnight
Schedule::call(function () {
    \App\Models\WhatsappInstance::query()
        ->update(['messages_sent_today' => 0]);
})->dailyAt('00:00')->name('reset-daily-counts');

// Trigger scheduled campaigns every minute
Schedule::command('campaigns:process-scheduled')
    ->everyMinute()
    ->name('process-scheduled-campaigns')
    ->withoutOverlapping();

