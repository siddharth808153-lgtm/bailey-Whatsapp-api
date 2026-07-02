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
                    'is_escalated' => $conv->is_escalated,
                    'message_count' => count($messages),
                    'last_message' => $lastMessage ? mb_substr($lastMessage['content'], 0, 80) : null,
                    'last_message_role' => $lastMessage ? $lastMessage['role'] : null,
                    'updated_at' => $conv->updated_at,
                    'created_at' => $conv->created_at,
                ];
            });

        return $this->success($conversations);
    }

    public function show(Request $request, $agentId, $convId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);
        $conversation = AiConversation::where('agent_id', $agent->id)->findOrFail($convId);

        $contact = \App\Models\Contact::where('user_id', $request->user()->id)
            ->where('phone', $conversation->contact_phone)
            ->first();

        return $this->success([
            'id' => $conversation->id,
            'contact_phone' => $conversation->contact_phone,
            'is_escalated' => $conversation->is_escalated,
            'messages' => $conversation->messages ?? [],
            'created_at' => $conversation->created_at,
            'updated_at' => $conversation->updated_at,
            'contact' => $contact ? [
                'name' => $contact->name,
                'email' => $contact->email,
                'is_opted_out' => $contact->is_opted_out,
                'tags' => $contact->tags ?? [],
                'custom1' => $contact->custom1,
                'custom2' => $contact->custom2,
                'custom3' => $contact->custom3,
            ] : null,
        ]);
    }

    /**
     * Resolve the human escalation and re-enable AI replies.
     */
    public function resolve(Request $request, $agentId, $convId)
    {
        $agent = AiAgent::where('user_id', $request->user()->id)->findOrFail($agentId);
        $conversation = AiConversation::where('agent_id', $agent->id)->findOrFail($convId);

        $conversation->update(['is_escalated' => false]);

        return $this->success(null, 'Escalation resolved and AI replies re-enabled.');
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
