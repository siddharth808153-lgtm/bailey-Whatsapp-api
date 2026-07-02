<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DripSequence;
use App\Models\DripStep;
use App\Models\DripEnrollment;
use App\Models\Contact;
use App\Models\ContactList;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DripEnrollmentController extends Controller
{
    use ApiResponse;

    protected function verifyOwnership($sequenceId)
    {
        return DripSequence::where('user_id', auth()->id())->findOrFail($sequenceId);
    }

    public function index(Request $request, $sequenceId)
    {
        $this->verifyOwnership($sequenceId);

        $query = DripEnrollment::where('sequence_id', $sequenceId)
            ->with(['contact:id,name,phone']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->whereHas('contact', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $enrollments = $query->orderBy('enrolled_at', 'desc')->paginate(20);

        // Append computed fields
        $enrollments->getCollection()->transform(function ($item) use ($sequenceId) {
            $step = DripStep::where('sequence_id', $sequenceId)
                ->where('step_number', $item->current_step)
                ->first();
            $item->current_step_details = $step;
            $item->days_in_sequence = $item->enrolled_at->diffInDays(Carbon::now());
            return $item;
        });

        return $this->paginated($enrollments, 'Enrollments retrieved successfully.');
    }

    public function enroll(Request $request, $sequenceId)
    {
        $sequence = $this->verifyOwnership($sequenceId);

        $validated = $request->validate([
            'contact_ids' => 'required|array|max:500',
            'contact_ids.*' => 'exists:contacts,id',
            'start_immediately' => 'sometimes|boolean',
        ]);

        $contactIds = $validated['contact_ids'];
        $startImmediately = $request->boolean('start_immediately', true);

        // Verify contacts belong to auth user
        $userContactsCount = Contact::where('user_id', auth()->id())
            ->whereIn('id', $contactIds)
            ->count();

        if ($userContactsCount !== count(array_unique($contactIds))) {
            return $this->error('Some selected contacts do not belong to you.', 403);
        }

        $step1 = DripStep::where('sequence_id', $sequenceId)->orderBy('step_number')->first();
        if (!$step1) {
            return $this->error('Cannot enroll contacts in a sequence with no steps.', 422);
        }

        $enrolledCount = 0;
        $skippedCount = 0;

        foreach ($contactIds as $contactId) {
            // Check not already enrolled (active or paused)
            $exists = DripEnrollment::where('sequence_id', $sequenceId)
                ->where('contact_id', $contactId)
                ->whereIn('status', ['active', 'paused'])
                ->exists();

            if ($exists) {
                $skippedCount++;
                continue;
            }

            // Calculate next send time
            $nextMessageAt = $startImmediately 
                ? Carbon::now() 
                : $this->calculateNextSendAt($step1);

            DripEnrollment::create([
                'sequence_id' => $sequence->id,
                'contact_id' => $contactId,
                'instance_id' => $sequence->instance_id,
                'current_step' => 1,
                'status' => 'active',
                'enrolled_at' => Carbon::now(),
                'next_message_at' => $nextMessageAt,
            ]);

            $enrolledCount++;
        }

        return $this->success([
            'enrolled' => $enrolledCount,
            'skipped_existing' => $skippedCount,
        ], 'Enrolled contacts successfully.');
    }

    public function enrollList(Request $request, $sequenceId)
    {
        $this->verifyOwnership($sequenceId);

        $validated = $request->validate([
            'list_id' => 'required|exists:contact_lists,id',
            'start_immediately' => 'sometimes|boolean',
        ]);

        // Verify contact list belongs to auth user
        $list = ContactList::where('user_id', auth()->id())->findOrFail($validated['list_id']);

        $contacts = Contact::whereHas('lists', function ($q) use ($list) {
            $q->where('contact_lists.id', $list->id);
        })
        ->where('is_opted_out', false)
        ->where('is_invalid', false)
        ->pluck('id')
        ->toArray();

        if (empty($contacts)) {
            return $this->success(['enrolled' => 0, 'skipped_existing' => 0], 'No eligible contacts found in the list.');
        }

        $request->merge(['contact_ids' => $contacts]);
        return $this->enroll($request, $sequenceId);
    }

    public function pause($sequenceId, $enrollmentId)
    {
        $this->verifyOwnership($sequenceId);
        $enrollment = DripEnrollment::where('sequence_id', $sequenceId)->findOrFail($enrollmentId);
        $enrollment->update(['status' => 'paused']);

        return $this->success(null, 'Enrollment paused successfully.');
    }

    public function resume($sequenceId, $enrollmentId)
    {
        $sequence = $this->verifyOwnership($sequenceId);
        $enrollment = DripEnrollment::where('sequence_id', $sequenceId)->findOrFail($enrollmentId);

        $step = DripStep::where('sequence_id', $sequenceId)
            ->where('step_number', $enrollment->current_step)
            ->first();

        $nextMessageAt = $step ? $this->calculateNextSendAt($step) : Carbon::now();

        $enrollment->update([
            'status' => 'active',
            'next_message_at' => $nextMessageAt,
        ]);

        return $this->success(null, 'Enrollment resumed successfully.');
    }

    public function remove($sequenceId, $enrollmentId)
    {
        $this->verifyOwnership($sequenceId);
        $enrollment = DripEnrollment::where('sequence_id', $sequenceId)->findOrFail($enrollmentId);
        $enrollment->update(['status' => 'unsubscribed']);

        return $this->success(null, 'Enrollment removed successfully.');
    }

    public function bulkAction(Request $request, $sequenceId)
    {
        $this->verifyOwnership($sequenceId);

        $validated = $request->validate([
            'enrollment_ids' => 'required|array',
            'enrollment_ids.*' => 'exists:drip_enrollments,id',
            'action' => 'required|in:pause,resume,remove',
        ]);

        $enrollments = DripEnrollment::where('sequence_id', $sequenceId)
            ->whereIn('id', $validated['enrollment_ids'])
            ->get();

        $updatedCount = 0;
        foreach ($enrollments as $enrollment) {
            if ($validated['action'] === 'pause') {
                $enrollment->update(['status' => 'paused']);
            } elseif ($validated['action'] === 'resume') {
                $step = DripStep::where('sequence_id', $sequenceId)
                    ->where('step_number', $enrollment->current_step)
                    ->first();
                $nextMessageAt = $step ? $this->calculateNextSendAt($step) : Carbon::now();
                $enrollment->update([
                    'status' => 'active',
                    'next_message_at' => $nextMessageAt,
                ]);
            } elseif ($validated['action'] === 'remove') {
                $enrollment->update(['status' => 'unsubscribed']);
            }
            $updatedCount++;
        }

        return $this->success(['updated' => $updatedCount], 'Bulk action completed.');
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
