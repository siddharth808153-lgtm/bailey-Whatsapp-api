<?php

namespace App\Services;

use App\Models\AiAgent;
use App\Models\AiConversation;
use App\Models\ChatbotConversation;
use App\Models\ChatbotFlow;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiChatbotService
{
    /**
     * Get AI reply using the NEW agent-based approach.
     * Uses user's global API key + agent's prompt/settings + knowledge base.
     */
    public function getAgentReply(
        AiAgent $agent,
        User $user,
        string $userMessage,
        array $conversationHistory = []
    ): ?string {
        try {
            $apiKey = Crypt::decrypt($user->ai_api_key);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt AI API key for user #' . $user->id . ': ' . $e->getMessage());
            return null;
        }

        // Build system prompt with knowledge base context
        $systemPrompt = $this->buildSystemPromptWithKnowledge($agent);

        $temperature = $agent->temperature ?? 0.7;
        $maxTokens = $agent->max_tokens ?? 500;

        return match ($user->ai_provider) {
            'openai' => $this->callOpenAI($apiKey, $systemPrompt, $userMessage, $conversationHistory, $temperature, $maxTokens),
            'gemini' => $this->callGemini($apiKey, $systemPrompt, $userMessage, $conversationHistory, $temperature, $maxTokens),
            'anthropic' => $this->callAnthropic($apiKey, $systemPrompt, $userMessage, $conversationHistory, $temperature, $maxTokens),
            default => null,
        };
    }

    /**
     * LEGACY: Get AI reply for a chatbot flow (backward compat with old per-flow AI config).
     */
    public function getReply(
        ChatbotFlow $flow,
        string $userMessage,
        array $conversationHistory = []
    ): ?string {
        try {
            $apiKey = Crypt::decrypt($flow->ai_api_key);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt AI API key for flow #' . $flow->id . ': ' . $e->getMessage());
            return null;
        }

        $systemPrompt = $flow->ai_system_prompt
            ?? 'You are a helpful WhatsApp assistant. Keep replies concise and friendly. Reply in the same language as the user. Never use markdown formatting.';

        return match ($flow->ai_provider) {
            'openai' => $this->callOpenAI($apiKey, $systemPrompt, $userMessage, $conversationHistory),
            'gemini' => $this->callGemini($apiKey, $systemPrompt, $userMessage, $conversationHistory),
            'anthropic' => $this->callAnthropic($apiKey, $systemPrompt, $userMessage, $conversationHistory),
            default => null,
        };
    }

    /**
     * Build system prompt enriched with knowledge base documents (RAG).
     */
    private function buildSystemPromptWithKnowledge(AiAgent $agent): string
    {
        $basePrompt = $agent->system_prompt
            ?? 'You are a helpful WhatsApp assistant. Keep replies concise and friendly. Reply in the same language as the user. Never use markdown formatting.';

        // Load knowledge docs
        $docs = $agent->knowledgeDocs()->get();

        if ($docs->isEmpty()) {
            return $basePrompt;
        }

        // Append knowledge as context (truncate to ~8000 chars to stay within token limits)
        $knowledgeText = '';
        $maxKnowledgeLength = 8000;

        foreach ($docs as $doc) {
            $chunk = "--- Document: {$doc->name} ---\n{$doc->content}\n\n";
            if (mb_strlen($knowledgeText) + mb_strlen($chunk) > $maxKnowledgeLength) {
                $remaining = $maxKnowledgeLength - mb_strlen($knowledgeText);
                if ($remaining > 100) {
                    $knowledgeText .= mb_substr($chunk, 0, $remaining) . '...[truncated]';
                }
                break;
            }
            $knowledgeText .= $chunk;
        }

        return $basePrompt . "\n\n"
            . "IMPORTANT: You have access to the following knowledge base documents. Use them to answer user questions accurately. "
            . "If the answer is not in the knowledge base, say so honestly.\n\n"
            . $knowledgeText;
    }

    /**
     * Call OpenAI Chat Completions API.
     */
    private function callOpenAI(
        string $key,
        string $system,
        string $message,
        array $history,
        float $temperature = 0.7,
        int $maxTokens = 500
    ): ?string {
        try {
            $messages = [
                ['role' => 'system', 'content' => $system],
            ];

            foreach ($history as $entry) {
                $messages[] = [
                    'role' => $entry['role'],
                    'content' => $entry['content'],
                ];
            }

            $messages[] = ['role' => 'user', 'content' => $message];

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $key,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-3.5-turbo',
                'messages' => $messages,
                'max_tokens' => $maxTokens,
                'temperature' => $temperature,
            ]);

            if ($response->successful()) {
                return $response->json('choices.0.message.content');
            }

            Log::error('OpenAI API error: ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error('OpenAI call failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Call Google Gemini API.
     */
    private function callGemini(
        string $key,
        string $system,
        string $message,
        array $history,
        float $temperature = 0.7,
        int $maxTokens = 500
    ): ?string {
        try {
            $contents = [];

            foreach ($history as $entry) {
                $role = $entry['role'] === 'assistant' ? 'model' : 'user';
                $contents[] = [
                    'role' => $role,
                    'parts' => [['text' => $entry['content']]],
                ];
            }

            $contents[] = [
                'role' => 'user',
                'parts' => [['text' => $message]],
            ];

            $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' . $key;

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($url, [
                'contents' => $contents,
                'systemInstruction' => [
                    'parts' => [['text' => $system]],
                ],
                'generationConfig' => [
                    'temperature' => $temperature,
                    'maxOutputTokens' => $maxTokens,
                ],
            ]);

            if ($response->successful()) {
                return $response->json('candidates.0.content.parts.0.text');
            }

            Log::error('Gemini API error: ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error('Gemini call failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Call Anthropic Claude API.
     */
    private function callAnthropic(
        string $key,
        string $system,
        string $message,
        array $history,
        float $temperature = 0.7,
        int $maxTokens = 500
    ): ?string {
        try {
            $messages = [];

            foreach ($history as $entry) {
                $messages[] = [
                    'role' => $entry['role'],
                    'content' => $entry['content'],
                ];
            }

            $messages[] = ['role' => 'user', 'content' => $message];

            $response = Http::withHeaders([
                'x-api-key' => $key,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
                'model' => 'claude-haiku-4-5-20251001',
                'system' => $system,
                'messages' => $messages,
                'max_tokens' => $maxTokens,
                'temperature' => $temperature,
            ]);

            if ($response->successful()) {
                return $response->json('content.0.text');
            }

            Log::error('Anthropic API error: ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error('Anthropic call failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Build conversation history from recent chatbot conversations.
     * Returns last 10 exchanges for context.
     */
    public function buildHistory(ChatbotConversation $conversation): array
    {
        return $conversation->state['history'] ?? [];
    }

    /**
     * Update conversation history in state.
     */
    public function appendHistory(
        ChatbotConversation $conversation,
        string $userMessage,
        string $botReply
    ): void {
        $history = $conversation->state['history'] ?? [];
        $history[] = ['role' => 'user', 'content' => $userMessage];
        $history[] = ['role' => 'assistant', 'content' => $botReply];

        // Keep only last 20 entries (10 exchanges)
        if (count($history) > 20) {
            $history = array_slice($history, -20);
        }

        $conversation->update([
            'state' => array_merge(
                $conversation->state ?? [],
                ['history' => $history]
            ),
        ]);
    }
}
