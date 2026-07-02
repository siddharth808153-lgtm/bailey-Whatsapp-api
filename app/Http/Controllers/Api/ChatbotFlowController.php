<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\PlanCheck;
use App\Models\ChatbotConversation;
use App\Models\ChatbotFlow;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class ChatbotFlowController extends Controller
{
    protected $planService;

    public function __construct(PlanService $planService)
    {
        $this->planService = $planService;
    }

    /**
     * List all chatbot flows for the authenticated user.
     */
    public function index()
    {
        $user = auth()->user();

        $flows = $user->chatbotFlows()
            ->with(['whatsappInstance:id,name,phone_number,status', 'aiAgent:id,name'])
            ->withCount(['chatbotRules', 'chatbotConversations as active_conversations_count' => function ($q) {
                $q->where('is_active', true);
            }])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $flows,
        ]);
    }

    /**
     * Create a new chatbot flow.
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        PlanCheck::or403(
            $this->planService->canAddChatbotFlow($user),
            'Chatbot Flows'
        );

        $request->validate([
            'name' => 'required|string|max:100',
            'instance_id' => 'nullable|exists:whatsapp_instances,id',
            'trigger_type' => 'required|in:keyword,any_message,first_message',
            'is_active' => 'boolean',
            'business_hours_only' => 'boolean',
            'business_hours_start' => 'nullable|date_format:H:i|required_if:business_hours_only,true',
            'business_hours_end' => 'nullable|date_format:H:i|required_if:business_hours_only,true',
            'away_message' => 'nullable|string|max:1000',
            'use_ai' => 'boolean',
            'ai_provider' => 'nullable|in:openai,gemini,anthropic|required_if:use_ai,true',
            'ai_api_key' => 'nullable|string|required_if:use_ai,true',
            'ai_system_prompt' => 'nullable|string|max:2000',
            'agent_id' => 'nullable|exists:ai_agents,id',
        ]);

        // Enforce AI plan check
        if ($request->boolean('use_ai')) {
            PlanCheck::or403(
                $this->planService->canUseAiChatbot($user),
                'AI Chatbot'
            );
        }

        // Verify instance ownership
        if ($request->filled('instance_id')) {
            $user->whatsappInstances()->findOrFail($request->instance_id);
        }

        $data = $request->only([
            'name', 'instance_id', 'trigger_type',
            'business_hours_only', 'business_hours_start', 'business_hours_end',
            'away_message', 'use_ai', 'ai_provider', 'ai_system_prompt',
            'agent_id',
        ]);

        $data['user_id'] = $user->id;
        $data['is_active'] = $request->boolean('is_active', false);
        $data['business_hours_only'] = $request->boolean('business_hours_only', false);
        $data['use_ai'] = $request->boolean('use_ai', false);

        // Encrypt AI API key
        if ($request->filled('ai_api_key')) {
            $data['ai_api_key'] = Crypt::encrypt($request->ai_api_key);
        }

        $flow = ChatbotFlow::create($data);

        return response()->json([
            'success' => true,
            'data' => $flow,
        ], 201);
    }

    /**
     * Show detailed chatbot flow with rules and recent conversations.
     */
    public function show($id)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($id);

        $flow->load([
            'whatsappInstance:id,name,phone_number,status',
            'aiAgent:id,name',
            'chatbotRules' => function ($q) {
                $q->orderBy('priority', 'desc')->orderBy('is_default', 'asc');
            },
        ]);

        $recentConversations = ChatbotConversation::where('flow_id', $flow->id)
            ->orderBy('last_message_at', 'desc')
            ->limit(10)
            ->get(['id', 'contact_phone', 'is_active', 'last_message_at', 'current_rule_id']);

        $flowData = $flow->toArray();
        $flowData['recent_conversations'] = $recentConversations;

        return response()->json([
            'success' => true,
            'data' => $flowData,
        ]);
    }

    /**
     * Update a chatbot flow.
     */
    public function update(Request $request, $id)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($id);

        $request->validate([
            'name' => 'nullable|string|max:100',
            'instance_id' => 'nullable|exists:whatsapp_instances,id',
            'trigger_type' => 'nullable|in:keyword,any_message,first_message',
            'is_active' => 'nullable|boolean',
            'business_hours_only' => 'nullable|boolean',
            'business_hours_start' => 'nullable|date_format:H:i',
            'business_hours_end' => 'nullable|date_format:H:i',
            'away_message' => 'nullable|string|max:1000',
            'use_ai' => 'nullable|boolean',
            'ai_provider' => 'nullable|in:openai,gemini,anthropic',
            'ai_api_key' => 'nullable|string',
            'ai_system_prompt' => 'nullable|string|max:2000',
            'agent_id' => 'nullable|exists:ai_agents,id',
        ]);

        // Enforce AI plan check if enabling AI
        if ($request->boolean('use_ai') && !$flow->use_ai) {
            PlanCheck::or403(
                $this->planService->canUseAiChatbot(auth()->user()),
                'AI Chatbot'
            );
        }

        // Verify instance ownership if changing
        if ($request->filled('instance_id')) {
            auth()->user()->whatsappInstances()->findOrFail($request->instance_id);
        }

        $data = $request->only([
            'name', 'instance_id', 'trigger_type', 'is_active',
            'business_hours_only', 'business_hours_start', 'business_hours_end',
            'away_message', 'use_ai', 'ai_provider', 'ai_system_prompt',
            'agent_id',
        ]);

        // Re-encrypt AI API key if changed
        if ($request->filled('ai_api_key')) {
            $data['ai_api_key'] = Crypt::encrypt($request->ai_api_key);
        }

        $flow->update($data);

        return response()->json([
            'success' => true,
            'data' => $flow->fresh(),
        ]);
    }

    /**
     * Delete a chatbot flow.
     */
    public function destroy($id)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($id);

        // Check for active conversations
        $hasActive = ChatbotConversation::where('flow_id', $id)
            ->where('is_active', true)
            ->exists();

        if ($hasActive) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete flow with active conversations. Wait for conversations to end or clear them first.',
            ], 422);
        }

        // Delete related records
        $flow->chatbotRules()->delete();
        $flow->chatbotConversations()->delete();
        $flow->delete();

        return response()->json([
            'success' => true,
            'message' => 'Chatbot flow deleted successfully.',
        ]);
    }

    /**
     * Toggle flow active status.
     */
    public function toggle($id)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($id);

        $newStatus = !$flow->is_active;

        // If activating, check instance is connected
        if ($newStatus && $flow->instance_id) {
            $instance = $flow->whatsappInstance;
            if ($instance && $instance->status !== 'connected') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot activate chatbot — instance is not connected.',
                ], 422);
            }
        }

        $flow->update(['is_active' => $newStatus]);

        return response()->json([
            'success' => true,
            'data' => [
                'is_active' => $newStatus,
                'message' => $newStatus ? 'Chatbot flow activated.' : 'Chatbot flow deactivated.',
            ],
        ]);
    }

    /**
     * Clear all active conversations for a flow.
     */
    public function clearConversations($id)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($id);

        $cleared = ChatbotConversation::where('flow_id', $flow->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'data' => ['cleared' => $cleared],
        ]);
    }

    /**
     * List paginated conversations for a flow.
     */
    public function conversations(Request $request, $id)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($id);

        $query = ChatbotConversation::where('flow_id', $flow->id)
            ->orderBy('last_message_at', 'desc');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $conversations = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $conversations->items(),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }
}
