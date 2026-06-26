<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\WelcomeNotification;
use App\Services\PlanService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PlanService $planService
    ) {}

    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Check if registration is open
        if (!config('wasp.allow_registration', true)) {
            return $this->error('Public registration is currently closed.', 403);
        }

        $user = DB::transaction(function () use ($validated) {
            // Create the user
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'user',
                'is_active' => true,
            ]);

            // Find the free plan
            $freePlan = Plan::where('slug', 'free')
                ->where('is_active', true)
                ->first();

            $trialDays = config('wasp.trial_days', 7);
            $trialEndsAt = Carbon::now()->addDays($trialDays);

            if ($freePlan) {
                // Create trial subscription
                Subscription::create([
                    'user_id' => $user->id,
                    'plan_id' => $freePlan->id,
                    'status' => 'trial',
                    'billing_cycle' => 'monthly',
                    'amount_paid' => 0,
                    'starts_at' => Carbon::now(),
                    'ends_at' => $trialEndsAt,
                    'payment_method' => 'free',
                ]);

                $user->update([
                    'plan_id' => $freePlan->id,
                    'trial_ends_at' => $trialEndsAt,
                ]);
            } else {
                $user->update([
                    'trial_ends_at' => $trialEndsAt,
                ]);
            }

            return $user;
        });

        // Send welcome notification (logs only for now)
        $user->notify(new WelcomeNotification());

        // Generate Sanctum token
        $token = $user->createToken('auth-token')->plainTextToken;

        $user->load('plan');

        return $this->success([
            'user' => new UserResource($user),
            'token' => $token,
            'plan' => $user->plan?->name ?? 'free',
            'trial_ends_at' => $user->trial_ends_at?->toIso8601String(),
        ], 'Registration successful.', 201);
    }

    /**
     * Login an existing user.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return $this->error('Invalid credentials.', 401);
        }

        if (!$user->is_active) {
            return $this->error(
                'Your account has been deactivated. Contact support or your reseller.',
                401
            );
        }

        // Delete old tokens (single session per user)
        $user->tokens()->delete();

        // Create new Sanctum token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Update last login
        $user->update(['last_login_at' => Carbon::now()]);

        // Load relationships
        $user->load('plan');
        $subscription = $this->planService->getActiveSubscription($user);
        $usageSummary = $this->planService->getUsageSummary($user);

        return $this->success([
            'user' => new UserResource($user),
            'token' => $token,
            'subscription' => $subscription,
            'plan' => $user->plan?->name,
            'usage_summary' => $usageSummary,
        ], 'Login successful.');
    }

    /**
     * Logout the authenticated user.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logged out successfully.');
    }

    /**
     * Get the authenticated user's profile.
     */
    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('plan');

        $subscription = $this->planService->getActiveSubscription($user);
        $usageSummary = $this->planService->getUsageSummary($user);

        return $this->success([
            'user' => new UserResource($user),
            'subscription' => $subscription,
            'plan' => $user->plan?->name,
            'usage_summary' => $usageSummary,
            'unread_notifications' => 0, // Placeholder
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return $this->error('Current password is incorrect.', 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        // Revoke all other tokens (keep current)
        $currentTokenId = $user->currentAccessToken()->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        return $this->success(null, 'Password changed successfully.');
    }

    /**
     * Request a password reset link.
     */
    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user) {
            // Create password reset token
            $token = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $validated['email']],
                [
                    'email' => $validated['email'],
                    'token' => Hash::make($token),
                    'created_at' => Carbon::now(),
                ]
            );

            Log::info("Password reset requested for: {$validated['email']}", [
                'token' => $token, // In production, send this via email instead
            ]);
        }

        // Always return success to not leak whether email exists
        return $this->success(null, 'If an account with that email exists, a password reset link has been sent.');
    }

    /**
     * Reset password using token.
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (!$resetRecord || !Hash::check($validated['token'], $resetRecord->token)) {
            return $this->error('Invalid or expired reset token.', 422);
        }

        // Check if token is not too old (e.g., 60 minutes)
        $tokenCreatedAt = Carbon::parse($resetRecord->created_at);
        if ($tokenCreatedAt->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
            return $this->error('Reset token has expired. Please request a new one.', 422);
        }

        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return $this->error('User not found.', 404);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Delete the reset token
        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        // Revoke all tokens
        $user->tokens()->delete();

        return $this->success(null, 'Password has been reset successfully. Please login with your new password.');
    }
}
