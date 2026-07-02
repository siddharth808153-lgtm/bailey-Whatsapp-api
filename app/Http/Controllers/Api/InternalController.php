<?php
// app/Http/Controllers/Api/InternalController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CampaignMessage;
use App\Models\ChatbotConversation;
use App\Models\ChatbotFlow;
use App\Models\ChatbotRule;
use App\Models\Contact;
use App\Models\AiConversation;
use App\Models\MessageLog;
use App\Models\WarmupSession;
use App\Models\WhatsappInstance;
use App\Services\AiChatbotService;
use Carbon\Carbon;
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
            'message_id' => 'nullable|string',
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
            'message_id' => $request->message_id,
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
     * Handle incoming chatbot message.
     * Called by Node.js when a message arrives.
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
            'message_id' => 'nullable|string',
            'media_url' => 'nullable|string',
            'media_filename' => 'nullable|string',
            'mimetype' => 'nullable|string',
            'is_group' => 'nullable|boolean',
        ]);

        // Ignore group messages
        if ($request->boolean('is_group')) {
            return response()->json(['success' => true, 'data' => ['reply' => null]]);
        }

        // Find the instance
        $instance = WhatsappInstance::where('session_id', $request->session_id)->first();
        if (!$instance) {
            return response()->json(['success' => true, 'data' => ['reply' => null]]);
        }

        // Strip JID completely to phone number (remove @s.whatsapp.net, @lid, @g.us etc)
        $phone = preg_replace('/@.*$/', '', $request->from);
        $phone = preg_replace('/:.*/', '', $phone); // Remove device suffix

        // Ensure message_type is one of the allowed enum values in message_logs
        $allowedTypes = ['text', 'image', 'video', 'document', 'audio', 'sticker', 'location'];
        $messageType = in_array($request->message_type, $allowedTypes) ? $request->message_type : 'text';

        // Log incoming message to message_logs
        MessageLog::create([
            'user_id' => $instance->user_id,
            'instance_id' => $instance->id,
            'message_id' => $request->message_id,
            'source_type' => 'chatbot',
            'to_phone' => $phone,
            'message_type' => $messageType,
            'message_body' => $request->body,
            'media_url' => $request->media_url,
            'status' => 'read',
            'sent_at' => $request->filled('timestamp') ? Carbon::createFromTimestamp($request->timestamp) : now(),
        ]);

        // Auto-create or find contact
        $contact = Contact::firstOrCreate(
            ['user_id' => $instance->user_id, 'phone' => $phone],
            ['name' => $phone, 'source' => 'chatbot_auto']
        );

        // Skip opted-out contacts (DND)
        if ($contact->opted_out) {
            return response()->json(['success' => true, 'data' => ['reply' => null]]);
        }

        // Find active flow: instance-specific first, then global (instance_id = null)
        $flow = ChatbotFlow::where('user_id', $instance->user_id)
            ->where('is_active', true)
            ->where(function ($q) use ($instance) {
                $q->where('instance_id', $instance->id)
                  ->orWhereNull('instance_id');
            })
            ->orderByRaw('instance_id IS NULL ASC') // instance-specific first
            ->first();

        if (!$flow) {
            return response()->json(['success' => true, 'data' => ['reply' => null]]);
        }

        // Business hours check
        if ($flow->business_hours_only) {
            $now = Carbon::now();
            $start = Carbon::parse($flow->business_hours_start);
            $end = Carbon::parse($flow->business_hours_end);

            if (!$now->between($start, $end)) {
                if ($flow->away_message) {
                    return response()->json([
                        'success' => true,
                        'data' => [
                            'reply' => [
                                'type' => 'text',
                                'body' => $flow->away_message,
                                'simulate_typing' => true,
                                'typing_delay_seconds' => 2,
                            ]
                        ]
                    ]);
                }
                return response()->json(['success' => true, 'data' => ['reply' => null]]);
            }
        }

        // Get or create conversation state
        $conversation = ChatbotConversation::firstOrCreate(
            [
                'instance_id' => $instance->id,
                'contact_phone' => $phone,
                'flow_id' => $flow->id,
            ],
            [
                'state' => ['history' => []],
                'is_active' => true,
            ]
        );

        $conversation->update([
            'last_message_at' => now(),
            'is_active' => true,
        ]);

        $body = trim($request->input('body', ''));

        // Check if there is an escalated AI conversation for this contact and flow's agent
        if ($flow->agent_id) {
            $aiConv = \App\Models\AiConversation::where('agent_id', $flow->agent_id)
                ->where('contact_phone', $phone)
                ->first();
            if ($aiConv && $aiConv->is_escalated) {
                return response()->json(['success' => true, 'data' => ['reply' => null]]);
            }
        }

        // First message trigger — only for new conversations
        if ($flow->trigger_type === 'first_message') {
            $isFirstMessage = $conversation->wasRecentlyCreated;
            if (!$isFirstMessage) {
                // For AI-enabled flows (agent or legacy), still process via AI on subsequent messages
                if ($flow->agent_id || $flow->use_ai) {
                    return $this->handleAiReply($flow, $conversation, $body);
                }
                return response()->json(['success' => true, 'data' => ['reply' => null]]);
            }
        }

        // Match rules by priority (highest first), skip default
        $rules = $flow->chatbotRules()
            ->where('is_default', false)
            ->orderBy('priority', 'desc')
            ->get();

        $matchedRule = null;

        foreach ($rules as $rule) {
            if ($this->matchesRule($rule, $body)) {
                $matchedRule = $rule;
                break;
            }
        }

        // Try default rule if no match
        if (!$matchedRule) {
            $matchedRule = $flow->chatbotRules()
                ->where('is_default', true)
                ->first();
        }

        // If no rule matched and AI is enabled (agent or legacy), use AI
        if (!$matchedRule && ($flow->agent_id || $flow->use_ai)) {
            return $this->handleAiReply($flow, $conversation, $body);
        }

        // If still no match, no reply
        if (!$matchedRule) {
            return response()->json(['success' => true, 'data' => ['reply' => null]]);
        }

        // Update conversation current rule
        $conversation->update(['current_rule_id' => $matchedRule->id]);

        // Handle flow redirect
        if ($matchedRule->response_type === 'flow_redirect' && $matchedRule->next_flow_id) {
            $nextFlow = ChatbotFlow::find($matchedRule->next_flow_id);
            if ($nextFlow && $nextFlow->is_active) {
                $conversation->update(['flow_id' => $nextFlow->id]);
                // Return null — the next message will be handled by the new flow
                return response()->json(['success' => true, 'data' => ['reply' => null]]);
            }
        }

        // Build reply response
        $reply = [
            'type' => $matchedRule->response_type,
            'body' => $matchedRule->response_body,
            'simulate_typing' => (bool) $matchedRule->simulate_typing,
            'typing_delay_seconds' => $matchedRule->typing_delay_seconds ?? 3,
        ];

        if ($matchedRule->response_media_url) {
            $reply['media_url'] = $matchedRule->response_media_url;
        }

        return response()->json([
            'success' => true,
            'data' => ['reply' => $reply],
        ]);
    }

    /**
     * Match incoming message body against a rule.
     */
    private function matchesRule(ChatbotRule $rule, string $body): bool
    {
        if (empty($body) || empty($rule->trigger_keyword)) {
            return false;
        }

        $keyword = $rule->trigger_keyword;

        return match ($rule->match_type) {
            'exact' => mb_strtolower($body) === mb_strtolower($keyword),
            'contains' => str_contains(mb_strtolower($body), mb_strtolower($keyword)),
            'starts_with' => str_starts_with(mb_strtolower($body), mb_strtolower($keyword)),
            'regex' => (bool) @preg_match('/' . $keyword . '/iu', $body),
            default => false,
        };
    }

    /**
     * Handle AI-powered reply for a chatbot flow.
     * Supports both new agent-based and legacy per-flow AI config.
     */
    private function handleAiReply(
        ChatbotFlow $flow,
        ChatbotConversation $conversation,
        string $body
    ) {
        $aiService = app(AiChatbotService::class);
        $history = $aiService->buildHistory($conversation);

        $aiReply = null;

        // NEW: Agent-based AI reply
        if ($flow->agent_id && $flow->aiAgent) {
            $agent = $flow->aiAgent;
            $user = $flow->user;

            if ($user && $user->ai_provider && $user->ai_api_key) {
                $aiReply = $aiService->getAgentReply($agent, $user, $body, $history, $conversation->contact_phone);

                // Also persist to AiConversation for the agent's conversation log
                if ($aiReply) {
                    $contactPhone = $conversation->contact_phone;
                    $aiConv = AiConversation::firstOrCreate(
                        [
                            'user_id' => $user->id,
                            'agent_id' => $agent->id,
                            'contact_phone' => $contactPhone,
                        ],
                        ['messages' => []]
                    );
                    $messages = $aiConv->messages ?? [];
                    $messages[] = ['role' => 'user', 'content' => $body, 'timestamp' => now()->toIso8601String()];
                    $messages[] = ['role' => 'assistant', 'content' => $aiReply, 'timestamp' => now()->toIso8601String()];
                    if (count($messages) > 50) {
                        $messages = array_slice($messages, -50);
                    }
                    $aiConv->update(['messages' => $messages]);
                }
            }
        }

        // LEGACY: Per-flow AI config fallback
        if (!$aiReply && $flow->use_ai && $flow->ai_api_key) {
            $aiReply = $aiService->getReply($flow, $body, $history);
        }

        if ($aiReply) {
            $aiService->appendHistory($conversation, $body, $aiReply);

            return response()->json([
                'success' => true,
                'data' => [
                    'reply' => [
                        'type' => 'text',
                        'body' => $aiReply,
                        'simulate_typing' => true,
                        'typing_delay_seconds' => min(5, max(2, (int) (mb_strlen($aiReply) / 50))),
                    ]
                ],
            ]);
        }

        return response()->json(['success' => true, 'data' => ['reply' => null]]);
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
            'message_id' => 'nullable|string',
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
        if ($request->filled('message_id')) {
            $msg->message_id = $request->message_id;
        }
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

    /**
     * Update message status receipt callbacks from Node.js (delivered, read).
     */
    public function updateMessageReceipt(Request $request)
    {
        if (!$this->verifySecret($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'message_id' => 'required|string',
            'status' => 'required|string|in:delivered,read',
            'timestamp' => 'nullable',
        ]);

        $status = $request->status;
        $timestamp = $request->filled('timestamp')
            ? Carbon::createFromTimestampMs($request->timestamp)
            : now();

        // 1. Update MessageLog
        $log = MessageLog::where('message_id', $request->message_id)->first();
        if ($log) {
            $log->status = $status;
            if ($status === 'delivered' && !$log->delivered_at) {
                $log->delivered_at = $timestamp;
            } elseif ($status === 'read') {
                $log->read_at = $timestamp;
                if (!$log->delivered_at) {
                    $log->delivered_at = $timestamp;
                }
            }
            $log->save();
        }

        // 2. Update CampaignMessage
        $campMsg = CampaignMessage::where('message_id', $request->message_id)->first();
        if ($campMsg) {
            $oldStatus = $campMsg->status;
            $campMsg->status = $status;
            
            if ($status === 'delivered') {
                $campMsg->delivered_at = $timestamp;
                
                // Increment delivered_count on campaign if it transitioned
                if ($campMsg->campaign && $oldStatus !== 'delivered') {
                    $campMsg->campaign->increment('delivered_count');
                }
            }
            $campMsg->save();
        }

        return response()->json(['success' => true]);
    }
}
