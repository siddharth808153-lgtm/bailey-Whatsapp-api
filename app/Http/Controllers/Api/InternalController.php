<?php
// app/Http/Controllers/Api/InternalController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CampaignMessage;
use App\Models\MessageLog;
use App\Models\WarmupSession;
use App\Models\WhatsappInstance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InternalController extends Controller
{
    /**
     * Verify X-Service-Secret on every request.
     */
    private function verifySecret(Request $request): bool
    {
        $secret = $request->header('X-Service-Secret');
        return $secret !== null && $secret === config('wasp.node_service_secret');
    }

    /**
     * Update instance status, phone number and connection logs.
     */
    public function updateInstanceStatus(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'session_id' => 'required|string',
            'status' => 'required|string',
            'phone_number' => 'nullable|string',
        ]);

        $instance = WhatsappInstance::where('session_id', $request->session_id)->first();

        if (!$instance) {
            return response()->json(['success' => false, 'message' => 'Instance not found'], 404);
        }

        $status = $request->status;
        $instance->status = $status;

        if ($request->filled('phone_number')) {
            $instance->phone_number = $request->phone_number;
        }

        if ($status === 'connected') {
            $instance->last_connected_at = now();
        } elseif (in_array($status, ['disconnected', 'logged_out', 'banned'])) {
            $instance->last_disconnected_at = now();
        }

        $instance->save();

        return response()->json(['success' => true]);
    }

    /**
     * Report WhatsApp number ban.
     */
    public function reportBanned(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'session_id' => 'required|string',
        ]);

        $instance = WhatsappInstance::where('session_id', $request->session_id)->first();

        if (!$instance) {
            return response()->json(['success' => false, 'message' => 'Instance not found'], 404);
        }

        $instance->status = 'banned';
        $instance->is_active = false;
        $instance->last_disconnected_at = now();
        $instance->save();

        return response()->json(['success' => true]);
    }

    /**
     * Write record to message_logs and update instance stats.
     */
    public function logMessage(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'session_id' => 'required|string',
            'to_phone' => 'required|string',
            'message_type' => 'required|string',
            'message_body' => 'nullable|string',
            'media_url' => 'nullable|string',
            'status' => 'required|string',
            'error_message' => 'nullable|string',
            'source_type' => 'required|string',
            'source_id' => 'nullable|integer',
        ]);

        $instance = WhatsappInstance::where('session_id', $request->session_id)->first();

        if (!$instance) {
            return response()->json(['success' => false, 'message' => 'Instance not found'], 404);
        }

        $sentAt = in_array($request->status, ['sent', 'delivered']) ? now() : null;

        $log = MessageLog::create([
            'user_id' => $instance->user_id,
            'instance_id' => $instance->id,
            'source_type' => $request->source_type,
            'source_id' => $request->source_id,
            'to_phone' => $request->to_phone,
            'message_type' => $request->message_type,
            'message_body' => $request->message_body,
            'media_url' => $request->media_url,
            'status' => $request->status,
            'error_message' => $request->error_message,
            'sent_at' => $sentAt,
        ]);

        // Increment instance statistics if successfully sent
        if ($request->status === 'sent' || $request->status === 'delivered') {
            $instance->increment('messages_sent_today');
            $instance->increment('messages_sent_this_month');
            $instance->last_message_sent_at = now();
            $instance->save();
        }

        return response()->json(['success' => true, 'data' => $log]);
    }



    /**
     * Handle incoming chatbot message. Stubbed for now.
     */
    public function handleIncomingMessage(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'session_id' => 'required|string',
            'from' => 'required|string',
            'message_type' => 'required|string',
            'body' => 'nullable|string',
            'timestamp' => 'required',
        ]);

        // Chatbot logic is implemented in subsequent stages. Return empty reply for now.
        return response()->json([
            'success' => true,
            'data' => [
                'reply' => null
            ]
        ]);
    }

    /**
     * Update warmup sessions statistics.
     */
    public function updateWarmupProgress(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'session_id' => 'required|string',
            'partner_session_id' => 'required|string',
            'sent_count' => 'required|integer',
        ]);

        $instance = WhatsappInstance::where('session_id', $request->session_id)->first();
        $partnerInstance = WhatsappInstance::where('session_id', $request->partner_session_id)->first();

        if (!$instance || !$partnerInstance) {
            return response()->json(['success' => false, 'message' => 'Instances not found'], 404);
        }

        $warmupSession = WarmupSession::where('instance_id', $instance->id)
            ->where('partner_instance_id', $partnerInstance->id)
            ->whereIn('status', ['running', 'pending'])
            ->first();

        if ($warmupSession) {
            $warmupSession->sent_count = $request->sent_count;
            if ($warmupSession->sent_count >= $warmupSession->target_messages) {
                $warmupSession->status = 'completed';
            }
            $warmupSession->save();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Update contact validity callback from Node.js service.
     */
    public function updateContactValidity(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'phone' => 'required|string',
            'user_id' => 'required|integer',
            'is_invalid' => 'required|boolean',
        ]);

        $contact = \App\Models\Contact::where('phone', $request->phone)
            ->where('user_id', $request->user_id)
            ->first();

        if ($contact) {
            $contact->update([
                'is_invalid' => $request->is_invalid,
            ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Callback from Node.js updating individual campaign message status.
     */
    public function updateCampaignMessageStatus(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'campaign_message_id' => 'required|integer',
            'status' => 'required|string|in:sent,delivered,failed,skipped',
            'error_message' => 'nullable|string',
            'sent_at' => 'nullable',
        ]);

        $msg = \App\Models\CampaignMessage::find($request->campaign_message_id);
        if (!$msg) {
            return response()->json(['success' => false, 'message' => 'Message log not found'], 404);
        }

        $oldStatus = $msg->status;

        $msg->status = $request->status;
        $msg->error_message = $request->error_message;
        if ($request->filled('sent_at')) {
            $msg->sent_at = $request->sent_at;
        }
        if ($request->status === 'delivered') {
            $msg->delivered_at = now();
        }
        $msg->save();

        $campaign = $msg->campaign;
        if ($campaign && $oldStatus !== $request->status) {
            if ($request->status === 'sent') {
                $campaign->increment('sent_count');
                $instance = $campaign->whatsappInstance;
                if ($instance) {
                    $instance->increment('messages_sent_today');
                    $instance->increment('messages_sent_this_month');
                }
                
                $user = $campaign->user;
                if ($user) {
                    $user->increment('messages_sent_this_month');
                }
            } elseif ($request->status === 'delivered') {
                $campaign->increment('delivered_count');
            } elseif ($request->status === 'failed') {
                $campaign->increment('failed_count');
            }

            $skipped = $campaign->campaignMessages()->where('status', 'skipped')->count();
            $totalProcessed = $campaign->sent_count + $campaign->failed_count + $skipped;

            if ($totalProcessed >= $campaign->total_contacts) {
                $campaign->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);
            }
        }

        return response()->json(['success' => true]);
    }

    /**
     * Callback from Node.js when campaign is paused.
     */
    public function campaignPaused(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'campaign_id' => 'required|integer',
        ]);

        $campaign = \App\Models\Campaign::find($request->campaign_id);
        if ($campaign && $campaign->status === 'running') {
            $campaign->update([
                'status' => 'paused',
            ]);
        }

        return response()->json(['success' => true]);
    }
}
