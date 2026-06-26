<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsSuperAdmin
{
    /**
     * Handle an incoming request.
     * Ensure the authenticated user has the super_admin role.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Super admin privileges required.',
            ], 403);
        }

        return $next($request);
    }
}
