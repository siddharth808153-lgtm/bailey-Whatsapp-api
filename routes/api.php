<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\InstanceController;
use App\Http\Controllers\Api\InternalController;
use App\Http\Controllers\Api\ResellerController;
use App\Http\Controllers\Api\SuperAdminController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| WASp - WhatsApp Automation SaaS Platform
| All routes return JSON responses.
|
*/

// -----------------------------------------------------------------------
// Public routes (no auth required)
// -----------------------------------------------------------------------
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Internal webhook callback routes (no Sanctum authentication, verified by secret header)
Route::prefix('internal')->group(function () {
    Route::post('/instance/status', [InternalController::class, 'updateInstanceStatus']);
    Route::post('/instance/banned', [InternalController::class, 'reportBanned']);
    Route::post('/message/log', [InternalController::class, 'logMessage']);
    Route::post('/campaign/message-status', [InternalController::class, 'updateCampaignMessageStatus']);
    Route::post('/chatbot/incoming', [InternalController::class, 'handleIncomingMessage']);
    Route::post('/warmup/progress', [InternalController::class, 'updateWarmupProgress']);
});

// -----------------------------------------------------------------------
// Authenticated routes (any role)
// -----------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'track.login'])->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    // Billing (authenticated, any role)
    Route::prefix('billing')->group(function () {
        Route::get('/plans', [BillingController::class, 'plans']);
        Route::get('/subscription', [BillingController::class, 'currentSubscription']);
        Route::post('/subscribe', [BillingController::class, 'subscribe']);
        Route::post('/cancel', [BillingController::class, 'cancel']);
        Route::get('/usage', [BillingController::class, 'usageSummary']);
        Route::get('/invoices', [BillingController::class, 'invoices']);
    });

    // -------------------------------------------------------------------
    // Reseller routes
    // -------------------------------------------------------------------
    Route::prefix('reseller')->middleware('reseller_or_super')->group(function () {
        Route::get('/dashboard', [ResellerController::class, 'dashboard']);
        Route::get('/users', [ResellerController::class, 'users']);
        Route::post('/users', [ResellerController::class, 'createUser']);
        Route::put('/users/{id}', [ResellerController::class, 'updateUser']);
        Route::post('/users/{id}/toggle-status', [ResellerController::class, 'toggleUserStatus']);
        Route::post('/users/{id}/assign-plan', [ResellerController::class, 'assignPlan']);
        Route::get('/settings', [ResellerController::class, 'resellerSettings']);
        Route::post('/settings', [ResellerController::class, 'resellerSettings']);
    });

    // -------------------------------------------------------------------
    // Super Admin routes
    // -------------------------------------------------------------------
    Route::prefix('admin')->middleware('super_admin')->group(function () {
        Route::get('/stats', [SuperAdminController::class, 'platformStats']);
        Route::get('/resellers', [SuperAdminController::class, 'resellers']);
        Route::get('/users', [SuperAdminController::class, 'allUsers']);
        Route::post('/resellers', [SuperAdminController::class, 'createReseller']);
        Route::put('/users/{id}', [SuperAdminController::class, 'manageUser']);
        Route::post('/resellers/{id}/add-credits', [SuperAdminController::class, 'addResellerCredits']);
        Route::get('/settings', [SuperAdminController::class, 'globalSettings']);
        Route::post('/settings', [SuperAdminController::class, 'globalSettings']);
    });

    // -------------------------------------------------------------------
    // Feature routes (protected by active_plan middleware)
    // These placeholder groups will be filled in Parts 3-8
    // -------------------------------------------------------------------
    Route::middleware('active_plan')->group(function () {

        // Part 3 — WhatsApp Instance Management
        Route::prefix('instances')->group(function () {
            Route::get('/', [InstanceController::class, 'index']);
            Route::post('/', [InstanceController::class, 'store']);
            Route::get('/{id}', [InstanceController::class, 'show']);
            Route::post('/{id}/connect', [InstanceController::class, 'connect']);
            Route::post('/{id}/disconnect', [InstanceController::class, 'disconnect']);
            Route::post('/{id}/logout', [InstanceController::class, 'logout']);
            Route::delete('/{id}', [InstanceController::class, 'destroy']);
        });

        // Part 4 — Contacts & Lists Management
        Route::prefix('contacts')->group(function () {
            // Placeholder: Contact CRUD, import/export, lists
        });

        // Part 5 — Campaigns & Messaging
        Route::prefix('campaigns')->group(function () {
            // Placeholder: Campaign CRUD, send, schedule, logs
        });

        // Part 6 — Chatbot & AI
        Route::prefix('chatbot')->group(function () {
            // Placeholder: Chatbot flows, rules, AI config
        });

        // Part 7 — Drip Sequences & Warmer
        Route::prefix('drip')->group(function () {
            // Placeholder: Drip sequences, steps, enrollments
        });

        Route::prefix('warmer')->group(function () {
            // Placeholder: Warmup sessions, progress
        });

        // Part 8 — Groups & Templates
        Route::prefix('groups')->group(function () {
            // Placeholder: WhatsApp group management
        });

        Route::prefix('templates')->group(function () {
            // Placeholder: Message templates CRUD
        });
    });
});
