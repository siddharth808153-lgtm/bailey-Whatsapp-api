<?php
// app/Http/Controllers/Api/CampaignController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\PlanCheck;
use App\Services\PlanService;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\ContactList;
use App\Models\WhatsappInstance;
use App\Jobs\ProcessCampaignJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CampaignController extends Controller
{
    protected $planService;

    public function __construct(PlanService $planService)
    {
        $this->planService = $planService;
    }

    /**
     * List user's campaigns with filters.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = $user->campaigns()
            ->with(['whatsappInstance:id,name,status', 'contactList:id,name,contact_count'])
            ->latest();

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('instance_id')) {
            $query->where('instance_id', $request->instance_id);
        }
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        // Summary stats
        $totalCampaigns = $user->campaigns()->count();
        $runningCount = $user->campaigns()->where('status', 'running')->count();
        $completedCount = $user->campaigns()->where('status', 'completed')->count();
        $scheduledCount = $user->campaigns()->where('status', 'scheduled')->count();

        $campaigns = $query->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $campaigns->items(),
            'meta' => [
                'current_page' => $campaigns->currentPage(),
                'last_page' => $campaigns->lastPage(),
                'per_page' => $campaigns->perPage(),
                'total' => $campaigns->total(),
                'total_campaigns' => $totalCampaigns,
                'running_count' => $runningCount,
                'completed_count' => $completedCount,
                'scheduled_count' => $scheduledCount,
            ]
        ]);
    }

    /**
     * Store and launch or schedule a campaign.
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        $request->validate([
            'name' => 'required|string|max:150',
            'instance_id' => 'required|exists:whatsapp_instances,id',
            'message_type' => 'required|string|in:text,image,video,document,audio',
            'message_body' => 'required_if:message_type,text|nullable|string|max:4096',
            'media_url' => 'required_unless:message_type,text|nullable|url',
            'media_filename' => 'nullable|string|max:255',
            'footer' => 'nullable|string|max:60',
            'buttons' => 'nullable|array|max:3',
            'buttons.*.text' => 'required_with:buttons|string|max:20',
            'contact_list_id' => 'nullable|exists:contact_lists,id',
            'custom_contacts' => 'nullable|array',
            'custom_contacts.*.phone' => 'required|string',
            'custom_contacts.*.name' => 'nullable|string',
            'min_delay_seconds' => 'integer|min:3|max:60',
            'max_delay_seconds' => 'integer|min:5|max:120',
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        if (empty($request->contact_list_id) && empty($request->custom_contacts)) {
            return response()->json([
                'success' => false,
                'message' => 'Provide either a contact list or custom contacts',
            ], 422);
        }

        // Verify instance ownership
        $instance = $user->whatsappInstances()->findOrFail($request->instance_id);

        // Ensure instance is connected
        if ($instance->status !== 'connected') {
            return response()->json([
                'success' => false,
                'message' => 'Selected WhatsApp instance is not connected',
            ], 422);
        }

        // Calculate targets
        $targetCount = 0;
        if ($request->contact_list_id) {
            $targetCount = Contact::whereHas('contactLists', function ($q) use ($request) {
                $q->where('contact_list_id', $request->contact_list_id);
            })
            ->where('is_opted_out', false)
            ->where('is_invalid', false)
            ->where('user_id', $user->id)
            ->count();
        } elseif ($request->custom_contacts) {
            $phones = [];
            foreach ($request->custom_contacts as $item) {
                $phone = preg_replace('/\D/', '', $item['phone'] ?? '');
                if (strlen($phone) === 10) {
                    $phone = '91' . $phone;
                }
                if (!empty($phone) && strlen($phone) >= 10 && strlen($phone) <= 13) {
                    // Check if opted out or invalid in DB
                    $dbContact = Contact::where('user_id', $user->id)
                        ->where('phone', $phone)
                        ->first();
                    if ($dbContact && ($dbContact->is_opted_out || $dbContact->is_invalid)) {
                        continue;
                    }
                    $phones[] = $phone;
                }
            }
            $targetCount = count(array_unique($phones));
        }

        if ($targetCount === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No valid recipients selected for the campaign.',
            ], 422);
        }

        // Enforce quota limits
        PlanCheck::or403(
            $this->planService->canSendMessages($user, $targetCount),
            'Messages'
        );

        $status = $request->scheduled_at ? 'scheduled' : 'draft';

        $campaign = $user->campaigns()->create([
            'instance_id' => $request->instance_id,
            'name' => $request->name,
            'status' => $status,
            'message_type' => $request->message_type,
            'message_body' => $request->message_body ?? '',
            'media_url' => $request->media_url,
            'media_filename' => $request->media_filename,
            'footer' => $request->footer,
            'buttons' => $request->buttons,
            'contact_list_id' => $request->contact_list_id,
            'custom_contacts' => $request->custom_contacts,
            'total_contacts' => $targetCount,
            'min_delay_seconds' => $request->input('min_delay_seconds', 5),
            'max_delay_seconds' => $request->input('max_delay_seconds', 15),
            'scheduled_at' => $request->scheduled_at,
        ]);

        if ($status === 'draft') {
            $campaign->update(['status' => 'running']);
            ProcessCampaignJob::dispatch($campaign);
        }

        return response()->json([
            'success' => true,
            'message' => 'Campaign created successfully.',
            'data' => $campaign->load(['whatsappInstance:id,name,status', 'contactList:id,name']),
        ], 201);
    }

    /**
     * Show detailed campaign with stats and paginated individual messages logs.
     */
    public function show($id)
    {
        $campaign = auth()->user()->campaigns()->findOrFail($id);

        $campaign->load(['whatsappInstance:id,name,status', 'contactList:id,name']);

        $messages = $campaign->campaignMessages()
            ->with('contact:id,name')
            ->paginate(50);

        // Progress metrics
        $sent = $campaign->sent_count;
        $failed = $campaign->failed_count;
        $total = $campaign->total_contacts;
        
        $pending = max(0, $total - ($sent + $failed));
        
        $progress = $total > 0 ? round((($sent + $failed) / $total) * 100, 2) : 0;

        // Estimate remaining time
        $avgDelay = ($campaign->min_delay_seconds + $campaign->max_delay_seconds) / 2;
        $estRemainingSeconds = $pending * $avgDelay;

        return response()->json([
            'success' => true,
            'data' => array_merge($campaign->toArray(), [
                'messages' => $messages->items(),
                'meta' => [
                    'current_page' => $messages->currentPage(),
                    'last_page' => $messages->lastPage(),
                    'per_page' => $messages->perPage(),
                    'total' => $messages->total(),
                    'pending_count' => $pending,
                    'progress_percentage' => $progress,
                    'estimated_time_remaining' => ceil($estRemainingSeconds / 60), // in minutes
                ]
            ])
        ]);
    }

    /**
     * Pause a running campaign.
     */
    public function pause($id)
    {
        $campaign = auth()->user()->campaigns()->findOrFail($id);

        if ($campaign->status !== 'running') {
            return response()->json([
                'success' => false,
                'message' => 'Campaign is not running.',
            ], 422);
        }

        $campaign->update(['status' => 'paused']);

        // Signal Node.js
        try {
            $nodeUrl = rtrim(config('wasp.node_service_url'), '/') . '/api/message/campaign/pause';
            Http::withHeaders([
                'X-Service-Secret' => config('wasp.node_service_secret'),
                'Content-Type' => 'application/json',
            ])->post($nodeUrl, [
                'campaign_id' => $campaign->id,
            ]);
        } catch (\Exception $e) {
            Log::error("Node.js paused webhook call failed: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Campaign paused successfully.',
        ]);
    }

    /**
     * Resume a paused campaign.
     */
    public function resume($id)
    {
        $campaign = auth()->user()->campaigns()->findOrFail($id);

        if ($campaign->status !== 'paused') {
            return response()->json([
                'success' => false,
                'message' => 'Campaign is not paused.',
            ], 422);
        }

        $campaign->update(['status' => 'running']);

        // Re-dispatch ProcessCampaignJob
        ProcessCampaignJob::dispatch($campaign);

        return response()->json([
            'success' => true,
            'message' => 'Campaign resumed successfully.',
        ]);
    }

    /**
     * Cancel a running/paused/scheduled campaign.
     */
    public function cancel($id)
    {
        $campaign = auth()->user()->campaigns()->findOrFail($id);

        if (!in_array($campaign->status, ['running', 'paused', 'scheduled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Campaign cannot be cancelled.',
            ], 422);
        }

        $campaign->update(['status' => 'cancelled']);

        // Signal Node.js
        try {
            $nodeUrl = rtrim(config('wasp.node_service_url'), '/') . '/api/message/campaign/cancel';
            Http::withHeaders([
                'X-Service-Secret' => config('wasp.node_service_secret'),
                'Content-Type' => 'application/json',
            ])->post($nodeUrl, [
                'campaign_id' => $campaign->id,
            ]);
        } catch (\Exception $e) {
            Log::error("Node.js cancelled webhook call failed: " . $e->getMessage());
        }

        // Update all pending messages to skipped
        $campaign->campaignMessages()
            ->where('status', 'pending')
            ->update(['status' => 'skipped']);

        return response()->json([
            'success' => true,
            'message' => 'Campaign cancelled successfully.',
        ]);
    }

    /**
     * Delete campaign.
     */
    public function destroy($id)
    {
        $campaign = auth()->user()->campaigns()->findOrFail($id);

        if (in_array($campaign->status, ['running', 'paused', 'scheduled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cancel campaign before deleting.',
            ], 422);
        }

        // Cascade delete messages, then soft delete campaign
        $campaign->campaignMessages()->delete();
        $campaign->delete();

        return response()->json([
            'success' => true,
            'message' => 'Campaign deleted successfully.',
        ]);
    }

    /**
     * Fetch detailed metrics report.
     */
    public function report($id)
    {
        $campaign = auth()->user()->campaigns()->findOrFail($id);

        // Aggregate counts
        $total = $campaign->total_contacts;
        $sent = $campaign->sent_count;
        $delivered = $campaign->delivered_count;
        $failed = $campaign->failed_count;
        
        $skipped = $campaign->campaignMessages()->where('status', 'skipped')->count();

        $deliveryRate = $sent > 0 ? round(($delivered / $sent) * 100, 2) : 0;
        $failureRate = $sent > 0 ? round(($failed / $sent) * 100, 2) : 0;

        // Calculate duration minutes
        $started = $campaign->started_at;
        $completed = $campaign->completed_at ?? now();
        $durationMinutes = ($started && $completed) ? max(1, ceil($started->diffInMinutes($completed))) : 0;

        $messages = $campaign->campaignMessages()
            ->with('contact:id,name')
            ->paginate(100);

        // Hourly breakdown (database-agnostic aggregation in PHP)
        $hourlyMap = [];
        $rawMsgs = $campaign->campaignMessages()
            ->whereNotNull('sent_at')
            ->get(['sent_at', 'status']);

        foreach ($rawMsgs as $msg) {
            $hour = $msg->sent_at->format('H:00');
            if (!isset($hourlyMap[$hour])) {
                $hourlyMap[$hour] = [
                    'hour' => $hour,
                    'sent' => 0,
                    'failed' => 0,
                ];
            }
            $hourlyMap[$hour]['sent']++;
            if ($msg->status === 'failed') {
                $hourlyMap[$hour]['failed']++;
            }
        }
        ksort($hourlyMap);

        return response()->json([
            'success' => true,
            'data' => [
                'campaign' => $campaign->toArray(),
                'summary' => [
                    'total' => $total,
                    'sent' => $sent,
                    'delivered' => $delivered,
                    'failed' => $failed,
                    'skipped' => $skipped,
                    'delivery_rate' => $deliveryRate,
                    'failure_rate' => $failureRate,
                    'duration_minutes' => $durationMinutes,
                ],
                'messages' => $messages->items(),
                'hourly_breakdown' => array_values($hourlyMap),
            ]
        ]);
    }

    /**
     * Duplicate an existing campaign setup.
     */
    public function duplicate($id)
    {
        $campaign = auth()->user()->campaigns()->findOrFail($id);

        $newCampaign = $campaign->replicate();
        $newCampaign->name = $campaign->name . ' (Copy)';
        $newCampaign->status = 'draft';
        $newCampaign->sent_count = 0;
        $newCampaign->delivered_count = 0;
        $newCampaign->failed_count = 0;
        $newCampaign->started_at = null;
        $newCampaign->completed_at = null;
        $newCampaign->save();

        return response()->json([
            'success' => true,
            'message' => 'Campaign duplicated successfully.',
            'data' => $newCampaign,
        ]);
    }
}
