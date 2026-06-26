<?php

namespace App\Http\Middleware;

use App\Services\PlanService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPlanFeature
{
    /**
     * Map feature names to PlanService method names.
     */
    protected array $featureMap = [
        'instances' => 'canAddInstance',
        'contacts' => 'canAddContacts',
        'drip' => 'canAddDripSequence',
        'chatbot' => 'canAddChatbotFlow',
        'ai_chatbot' => 'canUseAiChatbot',
        'groups' => 'canUseGroups',
        'warmer' => 'canUseWarmer',
        'api' => 'canUseApi',
        'white_label' => 'canWhiteLabel',
    ];

    public function __construct(
        protected PlanService $planService
    ) {}

    /**
     * Handle an incoming request.
     * Check if the user's plan allows the specified feature.
     *
     * Usage: Route::middleware('plan.feature:ai_chatbot')
     */
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required.',
            ], 401);
        }

        $method = $this->featureMap[$feature] ?? null;

        if (!$method) {
            return response()->json([
                'success' => false,
                'message' => "Unknown feature: {$feature}.",
            ], 500);
        }

        $allowed = $this->planService->{$method}($user);

        if (!$allowed) {
            $plan = $this->planService->getActivePlan($user);
            $planName = $plan ? $plan->name : 'None';

            return response()->json([
                'success' => false,
                'message' => "Your current plan doesn't include {$feature}. Please upgrade to access this feature.",
                'data' => [
                    'feature' => $feature,
                    'upgrade_url' => '/billing/plans',
                    'current_plan' => $planName,
                ],
            ], 403);
        }

        return $next($request);
    }
}
