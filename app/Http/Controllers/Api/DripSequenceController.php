<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DripSequence;
use App\Models\WhatsappInstance;
use App\Services\PlanService;
use App\Helpers\PlanCheck;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DripSequenceController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PlanService $planService
    ) {}

    public function index()
    {
        $user = auth()->user();
        $sequences = DripSequence::where('user_id', $user->id)
            ->with(['whatsappInstance:id,name,phone_number'])
            ->withCount([
                'dripSteps as steps_count',
                'dripEnrollments as active_enrollments_count' => function ($q) {
                    $q->where('status', 'active');
                },
                'dripEnrollments as completed_enrollments_count' => function ($q) {
                    $q->where('status', 'completed');
                }
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success($sequences, 'Drip sequences retrieved successfully.');
    }

    public function store(Request $request)
    {
        $user = auth()->user();

        PlanCheck::or403(
            $this->planService->canAddDripSequence($user),
            'Drip Sequences'
        );

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'instance_id' => 'required|exists:whatsapp_instances,id',
            'status' => 'sometimes|in:active,paused,archived',
        ]);

        // Verify instance ownership
        $instance = WhatsappInstance::where('user_id', $user->id)
            ->findOrFail($validated['instance_id']);

        $sequence = DripSequence::create([
            'user_id' => $user->id,
            'instance_id' => $instance->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return $this->success($sequence, 'Drip sequence created successfully.', 201);
    }

    public function show($id)
    {
        $user = auth()->user();
        $sequence = DripSequence::where('user_id', $user->id)
            ->with(['whatsappInstance:id,name,phone_number', 'dripSteps'])
            ->findOrFail($id);

        $stats = DB::table('drip_enrollments')
            ->select('status', DB::raw('count(*) as count'))
            ->where('sequence_id', $id)
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $sequence->enrollment_stats = [
            'active' => $stats['active'] ?? 0,
            'paused' => $stats['paused'] ?? 0,
            'completed' => $stats['completed'] ?? 0,
            'unsubscribed' => $stats['unsubscribed'] ?? 0,
        ];

        return $this->success($sequence, 'Drip sequence details retrieved.');
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
        $sequence = DripSequence::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'description' => 'nullable|string|max:500',
            'status' => 'sometimes|in:active,paused,archived',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'archived') {
            $activeCount = $sequence->dripEnrollments()->where('status', 'active')->count();
            if ($activeCount > 0) {
                return $this->error('Pause all active enrollments before archiving', 422);
            }
        }

        $sequence->update($validated);

        return $this->success($sequence, 'Drip sequence updated successfully.');
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $sequence = DripSequence::where('user_id', $user->id)->findOrFail($id);

        $activeCount = $sequence->dripEnrollments()->where('status', 'active')->count();
        if ($activeCount > 0) {
            return $this->error('Cannot delete a sequence with active enrollments.', 422);
        }

        DB::transaction(function () use ($sequence) {
            $sequence->dripSteps()->delete();
            $sequence->dripEnrollments()->delete();
            $sequence->delete();
        });

        return $this->success(null, 'Drip sequence deleted successfully.');
    }

    public function duplicate($id)
    {
        $user = auth()->user();
        $sequence = DripSequence::where('user_id', $user->id)->findOrFail($id);

        $newSequence = DB::transaction(function () use ($sequence, $user) {
            $dup = DripSequence::create([
                'user_id' => $user->id,
                'instance_id' => $sequence->instance_id,
                'name' => $sequence->name . ' (Copy)',
                'description' => $sequence->description,
                'status' => 'paused',
            ]);

            foreach ($sequence->dripSteps as $step) {
                $dup->dripSteps()->create([
                    'step_number' => $step->step_number,
                    'name' => $step->name,
                    'message_type' => $step->message_type,
                    'message_body' => $step->message_body,
                    'media_url' => $step->media_url,
                    'wait_days' => $step->wait_days,
                    'wait_hours' => $step->wait_hours,
                    'send_time' => $step->send_time,
                ]);
            }

            return $dup;
        });

        return $this->success($newSequence, 'Drip sequence duplicated successfully.', 201);
    }
}
