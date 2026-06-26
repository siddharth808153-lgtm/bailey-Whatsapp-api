<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackLastLogin
{
    /**
     * Handle an incoming request.
     * Update user's last_login_at if it's been more than 5 minutes
     * since the last update to avoid excessive DB writes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $shouldUpdate = !$user->last_login_at
                || $user->last_login_at->diffInMinutes(Carbon::now()) >= 5;

            if ($shouldUpdate) {
                $user->update(['last_login_at' => Carbon::now()]);
            }
        }

        return $next($request);
    }
}
