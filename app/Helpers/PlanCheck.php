<?php

namespace App\Helpers;

class PlanCheck
{
    /**
     * Abort with 403 JSON if the feature is not allowed.
     *
     * Usage in any controller:
     * PlanCheck::or403($this->planService->canUseAiChatbot($user), 'AI Chatbot');
     */
    public static function or403(bool $allowed, string $feature, string $upgradeUrl = '/billing/plans'): void
    {
        if (!$allowed) {
            abort(response()->json([
                'success' => false,
                'message' => "Your plan doesn't include {$feature}. Please upgrade.",
                'data' => [
                    'upgrade_url' => $upgradeUrl,
                ],
            ], 403));
        }
    }
}
