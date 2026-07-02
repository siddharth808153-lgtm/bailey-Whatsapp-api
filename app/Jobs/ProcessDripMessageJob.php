<?php

namespace App\Jobs;

use App\Models\DripEnrollment;
use App\Models\DripStep;
use App\Models\DripMessageLog;
use App\Models\Contact;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ProcessDripMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    public function __construct(
        protected DripEnrollment $enrollment
    ) {
        $this->onQueue('drip');
    }

    public function handle(): void
    {
        $enrollment = $this->enrollment->fresh([
            'dripSequence.whatsappInstance',
            'contact',
            'dripSequence.dripSteps'
        ]);

        if (!$enrollment || $enrollment->status !== 'active') {
            return;
        }

        $sequence = $enrollment->dripSequence;
        $instance = $sequence->whatsappInstance;
        $contact = $enrollment->contact;

        if ($contact->is_opted_out) {
            $enrollment->update(['status' => 'unsubscribed']);
            return;
        }

        if ($instance->status !== 'connected') {
            // Reschedule for 1 hour later
            $enrollment->update([
                'next_message_at' => Carbon::now()->addHour()
            ]);
            return;
        }

        $step = $sequence->dripSteps
            ->where('step_number', $enrollment->current_step)
            ->first();

        if (!$step) {
            $enrollment->update([
                'status' => 'completed',
                'completed_at' => Carbon::now()
            ]);
            return;
        }

        try {
            $response = Http::withHeaders([
                'X-Service-Secret' => config('wasp.node_service_secret')
            ])->timeout(15)->post(
                config('wasp.node_service_url') . '/api/message/send',
                [
                    'session_id' => $instance->session_id,
                    'phone' => $contact->phone,
                    'type' => $step->message_type,
                    'body' => $this->personalize($step->message_body ?? '', $contact),
                    'media_url' => $step->media_url,
                    'source_type' => 'drip',
                    'source_id' => $enrollment->id
                ]
            );

            if ($response->failed()) {
                throw new \Exception('Node service returned error: ' . $response->body());
            }

            DripMessageLog::create([
                'enrollment_id' => $enrollment->id,
                'step_id' => $step->id,
                'contact_id' => $contact->id,
                'instance_id' => $instance->id,
                'status' => 'sent',
                'sent_at' => Carbon::now()
            ]);

            // Advance to next step
            $nextStep = $sequence->dripSteps
                ->where('step_number', $enrollment->current_step + 1)
                ->first();

            if ($nextStep) {
                $nextSendAt = $this->calculateNextSendAt($nextStep);
                $enrollment->update([
                    'current_step' => $nextStep->step_number,
                    'next_message_at' => $nextSendAt
                ]);
            } else {
                $enrollment->update([
                    'status' => 'completed',
                    'completed_at' => Carbon::now()
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Drip message sending failed for enrollment {$enrollment->id}: " . $e->getMessage());

            DripMessageLog::create([
                'enrollment_id' => $enrollment->id,
                'step_id' => $step->id,
                'contact_id' => $contact->id,
                'instance_id' => $instance->id,
                'status' => 'failed',
                'error_message' => substr($e->getMessage(), 0, 500)
            ]);

            // Retry in 30 minutes
            $enrollment->update([
                'next_message_at' => Carbon::now()->addMinutes(30)
            ]);
        }
    }

    private function personalize(string $body, Contact $contact): string
    {
        return str_replace(
            ['{{name}}', '{{phone}}', '{{custom1}}', '{{custom2}}', '{{custom3}}'],
            [$contact->name, $contact->phone, $contact->custom1 ?? '', $contact->custom2 ?? '', $contact->custom3 ?? ''],
            $body
        );
    }

    private function calculateNextSendAt(DripStep $step): Carbon
    {
        $next = Carbon::now()
            ->addDays($step->wait_days)
            ->addHours($step->wait_hours);

        if ($step->send_time) {
            [$hour, $minute] = explode(':', $step->send_time);
            $next->setTime((int)$hour, (int)$minute, 0);
            if ($next->isPast()) {
                $next->addDay();
            }
        }

        return $next;
    }
}
