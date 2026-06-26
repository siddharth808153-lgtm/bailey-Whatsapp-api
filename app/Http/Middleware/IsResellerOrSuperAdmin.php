<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsResellerOrSuperAdmin
{
    /**
     * Handle an incoming request.
     * Ensure the authenticated user is either a reseller or super_admin.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !in_array($request->user()->role, ['reseller', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Reseller or super admin privileges required.',
            ], 403);
        }

        return $next($request);
    }
}
