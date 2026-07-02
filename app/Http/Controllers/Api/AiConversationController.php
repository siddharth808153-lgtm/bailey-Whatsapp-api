<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiConversation;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class AiConversationController extends Controller
{
    use ApiResponse;

    /**
     * List conversations for an agent (excluding playground).
     */
    public function index(Request $request, $agentId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);

        $conversations = AiConversation::where('agent_id', $agent->id)
            ->whereNotNull('contact_phone')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($conv) {
                $messages = $conv->messages ?? [];
                $lastMessage = end($messages);

                return [
                    'id' => $conv->id,
                    'contact_phone' => $conv->contact_phone,
                    'message_count' => count($messages),
                    'last_message' => $lastMessage ? mb_substr($lastMessage['content'], 0, 80) : null,
                    'last_message_role' => $lastMessage ? $lastMessage['role'] : null,
                    'updated_at' => $conv->updated_at,
                    'created_at' => $conv->created_at,
                ];
            });

        return $this->success($conversations);
    }

    /**
     * Show full conversation history.
     */
    public function show(Request $request, $agentId, $convId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);
        $conversation = AiConversation::where('agent_id', $agent->id)->findOrFail($convId);

        return $this->success([
            'id' => $conversation->id,
            'contact_phone' => $conversation->contact_phone,
            'messages' => $conversation->messages ?? [],
            'created_at' => $conversation->created_at,
            'updated_at' => $conversation->updated_at,
        ]);
    }

    /**
     * Delete a conversation.
     */
    public function destroy(Request $request, $agentId, $convId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);
        $conversation = AiConversation::where('agent_id', $agent->id)->findOrFail($convId);

        $conversation->delete();

        return $this->success(null, 'Conversation deleted.');
    }
}
