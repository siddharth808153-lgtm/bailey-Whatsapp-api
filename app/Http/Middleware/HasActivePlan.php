<?php

namespace App\Http\Middleware;

use App\Services\PlanService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HasActivePlan
{
    public function __construct(
        protected PlanService $planService
    ) {}

    /**
     * Handle an incoming request.
     * Ensure the authenticated user has an active plan.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$this->planService->hasActivePlan($request->user())) {
            return response()->json([
                'success' => false,
                'message' => 'No active plan. Please subscribe to continue.',
                'data' => [
                    'upgrade_url' => '/billing/plans',
                ],
            ], 403);
        }

        return $next($request);
    }
}
