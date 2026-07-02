<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiConversation;
use App\Services\AiChatbotService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class AiAgentController extends Controller
{
    use ApiResponse;

    /**
     * List all AI agents for the authenticated user.
     */
    public function index(Request $request)
    {
        $agents = AiAgent::where('user_id', $request->user()->id)
            ->withCount(['knowledgeDocs', 'conversations', 'chatbotFlows'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success($agents);
    }

    /**
     * Create a new AI agent.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'system_prompt' => 'nullable|string|max:5000',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'max_tokens' => 'nullable|integer|min:50|max:4000',
        ]);

        $agent = AiAgent::create([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'system_prompt' => $request->system_prompt ?? 'You are a helpful WhatsApp assistant. Keep replies concise and friendly. Reply in the same language as the user. Never use markdown formatting.',
            'temperature' => $request->temperature ?? 0.7,
            'max_tokens' => $request->max_tokens ?? 500,
            'is_active' => true,
        ]);

        return $this->success($agent, 'Agent created successfully.', 201);
    }

    /**
     * Show a single AI agent with its knowledge docs.
     */
    public function show(Request $request, $id)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)
            ->withCount(['knowledgeDocs', 'conversations', 'chatbotFlows'])
            ->with('knowledgeDocs')
            ->findOrFail($id);

        return $this->success($agent);
    }

    /**
     * Update an AI agent.
     */
    public function update(Request $request, $id)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($id);

        $request->validate([
            'name' => 'nullable|string|max:255',
            'system_prompt' => 'nullable|string|max:5000',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'max_tokens' => 'nullable|integer|min:50|max:4000',
            'is_active' => 'nullable|boolean',
        ]);

        $agent->update($request->only([
            'name', 'system_prompt', 'temperature', 'max_tokens', 'is_active',
        ]));

        return $this->success($agent, 'Agent updated successfully.');
    }

    /**
     * Delete an AI agent (soft delete).
     */
    public function destroy(Request $request, $id)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($id);
        $agent->delete();

        return $this->success(null, 'Agent deleted successfully.');
    }

    /**
     * Send a message to the agent playground and get an AI reply.
     */
    public function playground(Request $request, $id)
    {
        $user = $request->user();
        $agent = AiAgent::where('user_id', $user->id)->findOrFail($id);

        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        // Check if user has configured an AI key
        if (!$user->ai_provider || !$user->ai_api_key) {
            return $this->error('Please configure your AI API key first in AI Settings.', 422);
        }

        // Get or create playground conversation (contact_phone = null)
        $conversation = AiConversation::firstOrCreate(
            [
                'user_id' => $user->id,
                'agent_id' => $agent->id,
                'contact_phone' => null,
            ],
            ['messages' => []]
        );

        $userMessage = $request->message;

        // Build history from conversation
        $history = $conversation->messages ?? [];

        // Get AI reply
        $aiService = app(AiChatbotService::class);
        $aiReply = $aiService->getAgentReply($agent, $user, $userMessage, $history, null);

        if (!$aiReply) {
            return $this->error('AI service failed to respond. Check your API key and try again.', 500);
        }

        // Append to conversation
        $messages = $conversation->messages ?? [];
        $messages[] = ['role' => 'user', 'content' => $userMessage, 'timestamp' => now()->toIso8601String()];
        $messages[] = ['role' => 'assistant', 'content' => $aiReply, 'timestamp' => now()->toIso8601String()];

        // Keep last 50 messages (25 exchanges)
        if (count($messages) > 50) {
            $messages = array_slice($messages, -50);
        }

        $conversation->update(['messages' => $messages]);

        return $this->success([
            'reply' => $aiReply,
            'messages' => $messages,
        ]);
    }

    /**
     * Clear playground conversation for an agent.
     */
    public function clearPlayground(Request $request, $id)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($id);

        AiConversation::where('user_id', $request->user()->id)
            ->where('agent_id', $agent->id)
            ->whereNull('contact_phone')
            ->delete();

        return $this->success(null, 'Playground conversation cleared.');
    }
}
