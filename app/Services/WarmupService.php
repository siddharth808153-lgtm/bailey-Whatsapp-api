<?php

namespace App\Services;

use App\Models\WhatsappInstance;
use App\Models\WarmupSession;
use Carbon\Carbon;

class WarmupService
{
    public function getDailyTarget(int $dayNumber): int
    {
        $schedule = config('wasp.warmup_daily_targets', [
            1 => 20,
            2 => 35,
            3 => 55,
            4 => 80,
            5 => 110,
            6 => 150,
            7 => 200,
        ]);

        return $schedule[$dayNumber] ?? 200; // Cap at 200 after day 7
    }

    public function getCurrentDay(WhatsappInstance $instance): int
    {
        if (!$instance->warmup_started_at) {
            return 0;
        }
        
        $started = Carbon::parse($instance->warmup_started_at);
        return (int) $started->diffInDays(Carbon::now()) + 1;
    }

    public function isComplete(WhatsappInstance $instance): bool
    {
        $currentDay = $this->getCurrentDay($instance);
        $schedule = config('wasp.warmup_daily_targets', []);
        return $currentDay > count($schedule);
    }

    public function getTodaySent(WhatsappInstance $instance): int
    {
        return (int) WarmupSession::where('instance_id', $instance->id)
            ->whereDate('date', Carbon::today())
            ->sum('sent_count');
    }

    public function findPartner(WhatsappInstance $instance): ?WhatsappInstance
    {
        // Try user's other connected instances first
        $partner = WhatsappInstance::where('user_id', $instance->user_id)
            ->where('id', '!=', $instance->id)
            ->where('status', 'connected')
            ->where('is_warmed', true)
            ->first();

        if ($partner) {
            return $partner;
        }

        // Fall back to platform warmup numbers (super admin instances)
        return WhatsappInstance::whereHas('user', function ($q) {
                $q->where('role', 'super_admin');
            })
            ->where('status', 'connected')
            ->where('is_warmed', true)
            ->inRandomOrder()
            ->first();
    }
}
