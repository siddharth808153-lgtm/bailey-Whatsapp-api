<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappInstance;
use App\Models\WarmupSession;
use App\Services\PlanService;
use App\Services\WarmupService;
use App\Helpers\PlanCheck;
use App\Traits\ApiResponse;
use App\Jobs\StartWarmupJob;
use Illuminate\Http\Request;
use Carbon\Carbon;

class WarmupController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PlanService $planService,
        protected WarmupService $warmupService
    ) {}

    public function index()
    {
        $user = auth()->user();
        $instances = WhatsappInstance::where('user_id', $user->id)->get();

        $result = [];
        foreach ($instances as $inst) {
            $warmupDay = $this->warmupService->getCurrentDay($inst);
            $todayTarget = $this->warmupService->getDailyTarget($warmupDay);
            $todaySent = $this->warmupService->getTodaySent($inst);

            $scheduleCount = count(config('wasp.warmup_daily_targets', []));
            $warmupProgress = 0;
            if ($inst->is_warmed) {
                $warmupProgress = 100;
            } elseif ($inst->warmup_started_at && $scheduleCount > 0) {
                $warmupProgress = min(100, round((($warmupDay - 1) / $scheduleCount) * 100));
            }

            $result[] = [
                'id' => $inst->id,
                'name' => $inst->name,
                'phone_number' => $inst->phone_number,
                'status' => $inst->status,
                'is_warmed' => (bool)$inst->is_warmed,
                'warmup_started_at' => $inst->warmup_started_at,
                'warmup_completed_at' => $inst->warmup_completed_at,
                'warmup_day' => $warmupDay,
                'today_target' => $todayTarget,
                'today_sent' => $todaySent,
                'warmup_progress' => $warmupProgress,
                'can_start_warmup' => !$inst->is_warmed && $inst->status === 'connected',
            ];
        }

        return $this->success($result, 'Warmup instances retrieved successfully.');
    }

    public function start(Request $request)
    {
        $user = auth()->user();

        PlanCheck::or403(
            $this->planService->canUseWarmer($user),
            'Number Warmer'
        );

        $validated = $request->validate([
            'instance_id' => 'required|exists:whatsapp_instances,id',
            'partner_instance_id' => 'nullable|exists:whatsapp_instances,id',
        ]);

        $instance = WhatsappInstance::where('user_id', $user->id)
            ->findOrFail($validated['instance_id']);

        if ($instance->status !== 'connected') {
            return $this->error('Instance must be connected to start warmup', 422);
        }

        if ($instance->warmup_started_at && !$instance->is_warmed) {
            return $this->error('Warmup already in progress', 422);
        }

        $partnerInstance = null;
        if (!empty($validated['partner_instance_id'])) {
            $partnerInstance = WhatsappInstance::findOrFail($validated['partner_instance_id']);
        }

        $instance->update([
            'warmup_started_at' => Carbon::now(),
            'is_warmed' => false,
            'warmup_completed_at' => null,
        ]);

        StartWarmupJob::dispatch($instance, $partnerInstance);

        return $this->success([
            'message' => 'Warmup started',
            'schedule' => config('wasp.warmup_daily_targets'),
        ], 'Warmup started successfully.');
    }

    public function stop($instanceId)
    {
        $user = auth()->user();
        $instance = WhatsappInstance::where('user_id', $user->id)->findOrFail($instanceId);

        $instance->update([
            'warmup_started_at' => null,
        ]);

        // Cancel today's pending session
        WarmupSession::where('instance_id', $instance->id)
            ->whereDate('date', Carbon::today())
            ->update(['status' => 'cancelled']);

        return $this->success(null, 'Warmup stopped successfully.');
    }

    public function status($instanceId)
    {
        $user = auth()->user();
        $instance = WhatsappInstance::where('user_id', $user->id)->findOrFail($instanceId);

        $currentDay = $this->warmupService->getCurrentDay($instance);
        $todayTarget = $this->warmupService->getDailyTarget($currentDay);
        $todaySent = $this->warmupService->getTodaySent($instance);
        $totalSent = (int) WarmupSession::where('instance_id', $instance->id)->sum('sent_count');

        $scheduleConfig = config('wasp.warmup_daily_targets', []);
        $schedule = [];
        foreach ($scheduleConfig as $day => $target) {
            $sent = (int) WarmupSession::where('instance_id', $instance->id)
                ->where('day_number', $day)
                ->sum('sent_count');

            $schedule[] = [
                'day' => $day,
                'target' => $target,
                'sent' => $sent,
                'completed' => $sent >= $target,
                'active' => $day === $currentDay,
            ];
        }

        $recentSessions = WarmupSession::where('instance_id', $instance->id)
            ->with(['partnerInstance:id,name,phone_number'])
            ->orderBy('date', 'desc')
            ->limit(7)
            ->get();

        return $this->success([
            'instance_name' => $instance->name,
            'is_warmed' => (bool)$instance->is_warmed,
            'started_at' => $instance->warmup_started_at,
            'current_day' => $currentDay,
            'today_target' => $todayTarget,
            'today_sent' => $todaySent,
            'total_sent' => $totalSent,
            'schedule' => $schedule,
            'recent_sessions' => $recentSessions,
        ], 'Warmup status retrieved.');
    }

    public function history($instanceId)
    {
        $user = auth()->user();
        $instance = WhatsappInstance::where('user_id', $user->id)->findOrFail($instanceId);

        $history = WarmupSession::where('instance_id', $instance->id)
            ->with(['partnerInstance:id,name,phone_number'])
            ->orderBy('date', 'desc')
            ->paginate(20);

        return $this->paginated($history, 'Warmup history retrieved successfully.');
    }
}
