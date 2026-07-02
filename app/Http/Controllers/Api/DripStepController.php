<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DripSequence;
use App\Models\DripStep;
use App\Models\DripEnrollment;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DripStepController extends Controller
{
    use ApiResponse;

    protected function verifyOwnership($sequenceId)
    {
        return DripSequence::where('user_id', auth()->id())->findOrFail($sequenceId);
    }

    public function index($sequenceId)
    {
        $this->verifyOwnership($sequenceId);
        $steps = DripStep::where('sequence_id', $sequenceId)
            ->orderBy('step_number')
            ->get();

        return $this->success($steps, 'Drip steps retrieved successfully.');
    }

    public function store(Request $request, $sequenceId)
    {
        $this->verifyOwnership($sequenceId);

        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'message_type' => 'required|in:text,image,video,document',
            'message_body' => 'required_if:message_type,text|nullable|string|max:4096',
            'media_url' => 'nullable|url',
            'wait_days' => 'integer|min:0|max:365',
            'wait_hours' => 'integer|min:0|max:23',
            'send_time' => 'nullable|date_format:H:i',
        ]);

        $maxStepNumber = DripStep::where('sequence_id', $sequenceId)->max('step_number') ?? 0;
        $stepNumber = $maxStepNumber + 1;

        $step = DripStep::create(array_merge($validated, [
            'sequence_id' => $sequenceId,
            'step_number' => $stepNumber,
        ]));

        return $this->success($step, 'Drip step created successfully.', 201);
    }

    public function update(Request $request, $sequenceId, $id)
    {
        $this->verifyOwnership($sequenceId);
        $step = DripStep::where('sequence_id', $sequenceId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'message_type' => 'sometimes|in:text,image,video,document',
            'message_body' => 'required_if:message_type,text|nullable|string|max:4096',
            'media_url' => 'nullable|url',
            'wait_days' => 'sometimes|integer|min:0|max:365',
            'wait_hours' => 'sometimes|integer|min:0|max:23',
            'send_time' => 'nullable|date_format:H:i',
        ]);

        $step->update($validated);

        return $this->success($step, 'Drip step updated successfully.');
    }

    public function destroy($sequenceId, $id)
    {
        $this->verifyOwnership($sequenceId);
        $step = DripStep::where('sequence_id', $sequenceId)->findOrFail($id);

        $hasContactsWaiting = DripEnrollment::where('sequence_id', $sequenceId)
            ->where('current_step', $step->step_number)
            ->where('status', 'active')
            ->exists();

        if ($hasContactsWaiting) {
            return $this->error('Cannot delete step while contacts are waiting for it. Move them first or wait until they advance.', 422);
        }

        DB::transaction(function () use ($sequenceId, $step) {
            $deletedNumber = $step->step_number;
            $step->delete();

            // Shift down any steps with higher step numbers
            DripStep::where('sequence_id', $sequenceId)
                ->where('step_number', '>', $deletedNumber)
                ->decrement('step_number');
        });

        return $this->success(null, 'Drip step deleted and remaining steps re-numbered.');
    }

    public function reorder(Request $request, $sequenceId)
    {
        $this->verifyOwnership($sequenceId);

        $validated = $request->validate([
            'steps' => 'required|array',
            'steps.*.id' => 'required|exists:drip_steps,id',
            'steps.*.step_number' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($sequenceId, $validated) {
            foreach ($validated['steps'] as $item) {
                $step = DripStep::where('sequence_id', $sequenceId)->findOrFail($item['id']);
                
                // If step number changed, update next_message_at for active enrollments waiting on it
                if ($step->step_number !== (int)$item['step_number']) {
                    DripEnrollment::where('sequence_id', $sequenceId)
                        ->where('current_step', $step->step_number)
                        ->update(['current_step' => (int)$item['step_number']]);
                }

                $step->update(['step_number' => $item['step_number']]);
            }
        });

        return $this->success(null, 'Steps reordered successfully.');
    }
}
