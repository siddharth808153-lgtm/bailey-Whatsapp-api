<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsReseller
{
    /**
     * Handle an incoming request.
     * Ensure the authenticated user has the reseller role.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->role !== 'reseller') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Reseller privileges required.',
            ], 403);
        }

        return $next($request);
    }
}
