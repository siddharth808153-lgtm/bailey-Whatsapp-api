<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatbotFlow;
use App\Models\ChatbotRule;
use Illuminate\Http\Request;

class ChatbotRuleController extends Controller
{
    /**
     * List all rules for a chatbot flow.
     */
    public function index($flowId)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($flowId);

        $rules = $flow->chatbotRules()
            ->orderBy('priority', 'desc')
            ->orderBy('is_default', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $rules,
        ]);
    }

    /**
     * Create a new rule for a chatbot flow.
     */
    public function store(Request $request, $flowId)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($flowId);

        $request->validate([
            'trigger_keyword' => 'nullable|string|max:255|required_unless:is_default,true',
            'match_type' => 'required|in:exact,contains,starts_with,regex',
            'is_default' => 'boolean',
            'response_type' => 'required|in:text,image,video,document,audio,flow_redirect',
            'response_body' => 'nullable|string|max:4096|required_unless:response_type,flow_redirect',
            'response_media_url' => 'nullable|url|max:2048',
            'next_flow_id' => 'nullable|integer|exists:chatbot_flows,id|required_if:response_type,flow_redirect',
            'simulate_typing' => 'boolean',
            'typing_delay_seconds' => 'integer|min:1|max:10',
            'priority' => 'integer|min:0|max:999',
        ]);

        // Ensure only one default rule per flow
        if ($request->boolean('is_default')) {
            $hasDefault = $flow->chatbotRules()->where('is_default', true)->exists();
            if ($hasDefault) {
                return response()->json([
                    'success' => false,
                    'message' => 'This flow already has a default rule. Update it instead.',
                ], 422);
            }
        }

        // Validate regex if match_type is regex
        if ($request->input('match_type') === 'regex' && $request->filled('trigger_keyword')) {
            $pattern = $request->input('trigger_keyword');
            if (@preg_match('/' . $pattern . '/u', '') === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid regex pattern.',
                ], 422);
            }
        }

        $rule = $flow->chatbotRules()->create([
            'trigger_keyword' => $request->input('trigger_keyword'),
            'match_type' => $request->input('match_type'),
            'is_default' => $request->boolean('is_default', false),
            'response_type' => $request->input('response_type'),
            'response_body' => $request->input('response_body'),
            'response_media_url' => $request->input('response_media_url'),
            'next_flow_id' => $request->input('next_flow_id'),
            'simulate_typing' => $request->boolean('simulate_typing', true),
            'typing_delay_seconds' => $request->input('typing_delay_seconds', 3),
            'priority' => $request->input('priority', 0),
        ]);

        return response()->json([
            'success' => true,
            'data' => $rule,
        ], 201);
    }

    /**
     * Update a chatbot rule.
     */
    public function update(Request $request, $flowId, $ruleId)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($flowId);
        $rule = $flow->chatbotRules()->findOrFail($ruleId);

        $request->validate([
            'trigger_keyword' => 'nullable|string|max:255',
            'match_type' => 'nullable|in:exact,contains,starts_with,regex',
            'is_default' => 'nullable|boolean',
            'response_type' => 'nullable|in:text,image,video,document,audio,flow_redirect',
            'response_body' => 'nullable|string|max:4096',
            'response_media_url' => 'nullable|url|max:2048',
            'next_flow_id' => 'nullable|integer|exists:chatbot_flows,id',
            'simulate_typing' => 'nullable|boolean',
            'typing_delay_seconds' => 'nullable|integer|min:1|max:10',
            'priority' => 'nullable|integer|min:0|max:999',
        ]);

        // Prevent multiple default rules
        if ($request->boolean('is_default') && !$rule->is_default) {
            $hasDefault = $flow->chatbotRules()
                ->where('is_default', true)
                ->where('id', '!=', $rule->id)
                ->exists();

            if ($hasDefault) {
                return response()->json([
                    'success' => false,
                    'message' => 'This flow already has a default rule.',
                ], 422);
            }
        }

        // Validate regex
        if ($request->input('match_type') === 'regex' && $request->filled('trigger_keyword')) {
            if (@preg_match('/' . $request->input('trigger_keyword') . '/u', '') === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid regex pattern.',
                ], 422);
            }
        }

        $rule->update($request->only([
            'trigger_keyword', 'match_type', 'is_default',
            'response_type', 'response_body', 'response_media_url',
            'next_flow_id', 'simulate_typing', 'typing_delay_seconds', 'priority',
        ]));

        return response()->json([
            'success' => true,
            'data' => $rule->fresh(),
        ]);
    }

    /**
     * Delete a chatbot rule.
     */
    public function destroy($flowId, $ruleId)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($flowId);
        $rule = $flow->chatbotRules()->findOrFail($ruleId);

        $rule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rule deleted.',
        ]);
    }

    /**
     * Bulk reorder rules by priority.
     */
    public function reorder(Request $request, $flowId)
    {
        $flow = auth()->user()->chatbotFlows()->findOrFail($flowId);

        $request->validate([
            'rules' => 'required|array|min:1',
            'rules.*.id' => 'required|integer|exists:chatbot_rules,id',
            'rules.*.priority' => 'required|integer|min:0|max:999',
        ]);

        foreach ($request->input('rules') as $item) {
            $rule = $flow->chatbotRules()->find($item['id']);
            if ($rule) {
                $rule->update(['priority' => $item['priority']]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Rules reordered.',
        ]);
    }
}
