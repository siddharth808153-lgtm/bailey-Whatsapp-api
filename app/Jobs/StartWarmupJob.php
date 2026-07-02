<?php

namespace App\Jobs;

use App\Models\WhatsappInstance;
use App\Models\WarmupSession;
use App\Services\WarmupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class StartWarmupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 120;

    public function __construct(
        protected WhatsappInstance $instance,
        protected ?WhatsappInstance $partnerInstance = null
    ) {
        $this->onQueue('warmup');
    }

    public function handle(WarmupService $warmupService): void
    {
        $instance = $this->instance->fresh();

        if (!$instance || $instance->status !== 'connected' || !$instance->warmup_started_at) {
            return;
        }

        $dayNumber = $warmupService->getCurrentDay($instance);

        // Check if warmup complete
        if ($warmupService->isComplete($instance)) {
            $instance->update([
                'is_warmed' => true,
                'warmup_completed_at' => Carbon::now(),
            ]);
            return;
        }

        $dailyTarget = $warmupService->getDailyTarget($dayNumber);
        $todaySent = $warmupService->getTodaySent($instance);
        $remaining = $dailyTarget - $todaySent;

        if ($remaining <= 0) {
            // Today's quota done — schedule for tomorrow at 10:00 AM
            $this->scheduleForTomorrow($instance);
            return;
        }

        // Find partner instance
        $partner = $this->partnerInstance ?? $warmupService->findPartner($instance);

        if (!$partner) {
            Log::warning("No warmup partner found for instance {$instance->id}");
            return;
        }

        // Create warmup session
        $session = WarmupSession::create([
            'instance_id' => $instance->id,
            'partner_instance_id' => $partner->id,
            'day_number' => $dayNumber,
            'target_messages' => $remaining,
            'sent_count' => 0,
            'status' => 'running',
            'date' => Carbon::today(),
        ]);

        try {
            $response = Http::withHeaders([
                'X-Service-Secret' => config('wasp.node_service_secret')
            ])->timeout(30)->post(
                config('wasp.node_service_url') . '/api/warmup/start',
                [
                    'session_id' => $instance->session_id,
                    'partner_session_id' => $partner->session_id,
                    'target_count' => $remaining,
                    'warmup_session_id' => $session->id,
                ]
            );

            if ($response->failed()) {
                throw new \Exception('Node warmer API returned error status: ' . $response->status());
            }

        } catch (\Exception $e) {
            Log::error("Failed to start warmup session {$session->id} in Node service: " . $e->getMessage());
            $session->update(['status' => 'failed']);
        }
    }

    private function scheduleForTomorrow(WhatsappInstance $instance): void
    {
        StartWarmupJob::dispatch($instance)
            ->delay(Carbon::now()->addDay()->startOfDay()->addHours(10));
    }
}
