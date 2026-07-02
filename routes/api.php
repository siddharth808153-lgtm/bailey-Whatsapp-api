<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\ChatbotFlowController;
use App\Http\Controllers\Api\ChatbotRuleController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ContactListController;
use App\Http\Controllers\Api\InstanceController;
use App\Http\Controllers\Api\InternalController;
use App\Http\Controllers\Api\MessageTemplateController;
use App\Http\Controllers\Api\ResellerController;
use App\Http\Controllers\Api\SuperAdminController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\DripSequenceController;
use App\Http\Controllers\Api\DripStepController;
use App\Http\Controllers\Api\DripEnrollmentController;
use App\Http\Controllers\Api\WarmupController;
use App\Http\Controllers\Api\MediaFileController;
use App\Http\Controllers\Api\AiAgentController;
use App\Http\Controllers\Api\AiConfigController;
use App\Http\Controllers\Api\AiKnowledgeController;
use App\Http\Controllers\Api\AiConversationController;
use App\Http\Controllers\Api\GroupController;
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
    Route::post('/campaign/paused', [InternalController::class, 'campaignPaused']);
    Route::post('/chatbot/incoming', [InternalController::class, 'handleIncomingMessage']);
    Route::post('/message/receipt', [InternalController::class, 'updateMessageReceipt']);
    Route::post('/warmup/progress', [InternalController::class, 'updateWarmupProgress']);
    Route::post('/contact/validity', [InternalController::class, 'updateContactValidity']);
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
        Route::post('/impersonate/{id}', [SuperAdminController::class, 'impersonate']);
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
            Route::get('/', [ContactController::class, 'index']);
            Route::post('/', [ContactController::class, 'store']);
            Route::get('/export', [ContactController::class, 'exportCsv']);
            Route::post('/preview-csv', [ContactController::class, 'previewCsv']);
            Route::post('/import', [ContactController::class, 'import']);
            Route::post('/bulk-delete', [ContactController::class, 'bulkDestroy']);
            Route::post('/bulk-opt-out', [ContactController::class, 'bulkOptOut']);
            Route::post('/check-numbers', [ContactController::class, 'checkNumbers']);
            Route::post('/send-message', [ContactController::class, 'quickSend']);
            Route::get('/{id}', [ContactController::class, 'show']);
            Route::put('/{id}', [ContactController::class, 'update']);
            Route::delete('/{id}', [ContactController::class, 'destroy']);
            Route::post('/{id}/opt-out', [ContactController::class, 'optOut']);
            Route::post('/{id}/opt-in', [ContactController::class, 'optIn']);
        });

        // Contact Lists
        Route::prefix('lists')->group(function () {
            Route::get('/', [ContactListController::class, 'index']);
            Route::post('/', [ContactListController::class, 'store']);
            Route::get('/{id}', [ContactListController::class, 'show']);
            Route::put('/{id}', [ContactListController::class, 'update']);
            Route::delete('/{id}', [ContactListController::class, 'destroy']);
            Route::post('/{id}/contacts/add', [ContactListController::class, 'addContacts']);
            Route::post('/{id}/contacts/remove', [ContactListController::class, 'removeContacts']);
            Route::post('/{id}/import', [ContactListController::class, 'importToList']);
        });

        // Tags
        Route::prefix('tags')->group(function () {
            Route::get('/', [TagController::class, 'index']);
            Route::post('/bulk-tag', [TagController::class, 'bulkTag']);
        });

        // WhatsApp Groups
        Route::prefix('groups')->group(function () {
            Route::get('/', [GroupController::class, 'index']);
            Route::post('/', [GroupController::class, 'store']);
            Route::get('/{groupId}/participants', [GroupController::class, 'participants']);
            Route::post('/{groupId}/participants', [GroupController::class, 'updateParticipants']);
            Route::get('/{groupId}/invite', [GroupController::class, 'inviteCode']);
            Route::post('/{groupId}/invite/revoke', [GroupController::class, 'revokeInviteCode']);
            Route::post('/{groupId}/settings', [GroupController::class, 'updateSetting']);
            Route::post('/{groupId}/leave', [GroupController::class, 'leaveGroup']);
        });

        // Part 5 — Campaigns & Messaging
        Route::prefix('campaigns')->group(function () {
            Route::get('/', [CampaignController::class, 'index']);
            Route::post('/', [CampaignController::class, 'store']);
            Route::get('/{id}', [CampaignController::class, 'show']);
            Route::delete('/{id}', [CampaignController::class, 'destroy']);
            Route::post('/{id}/pause', [CampaignController::class, 'pause']);
            Route::post('/{id}/resume', [CampaignController::class, 'resume']);
            Route::post('/{id}/cancel', [CampaignController::class, 'cancel']);
            Route::get('/{id}/report', [CampaignController::class, 'report']);
            Route::post('/{id}/duplicate', [CampaignController::class, 'duplicate']);
        });

        // Message Templates
        Route::prefix('templates')->group(function () {
            Route::get('/', [MessageTemplateController::class, 'index']);
            Route::post('/', [MessageTemplateController::class, 'store']);
            Route::get('/{id}', [MessageTemplateController::class, 'show']);
            Route::put('/{id}', [MessageTemplateController::class, 'update']);
            Route::delete('/{id}', [MessageTemplateController::class, 'destroy']);
            Route::get('/{id}/use', [MessageTemplateController::class, 'useInCampaign']);
        });

        // Part 6 — Chatbot & AI
        Route::prefix('chatbot')->group(function () {
            // Chatbot Flows
            Route::get('/flows', [ChatbotFlowController::class, 'index']);
            Route::post('/flows', [ChatbotFlowController::class, 'store']);
            Route::get('/flows/{id}', [ChatbotFlowController::class, 'show']);
            Route::put('/flows/{id}', [ChatbotFlowController::class, 'update']);
            Route::delete('/flows/{id}', [ChatbotFlowController::class, 'destroy']);
            Route::post('/flows/{id}/toggle', [ChatbotFlowController::class, 'toggle']);
            Route::post('/flows/{id}/clear-conversations', [ChatbotFlowController::class, 'clearConversations']);
            Route::get('/flows/{id}/conversations', [ChatbotFlowController::class, 'conversations']);

            // Chatbot Rules (nested under flow)
            Route::get('/flows/{flowId}/rules', [ChatbotRuleController::class, 'index']);
            Route::post('/flows/{flowId}/rules', [ChatbotRuleController::class, 'store']);
            Route::put('/flows/{flowId}/rules/{ruleId}', [ChatbotRuleController::class, 'update']);
            Route::delete('/flows/{flowId}/rules/{ruleId}', [ChatbotRuleController::class, 'destroy']);
            Route::post('/flows/{flowId}/rules/reorder', [ChatbotRuleController::class, 'reorder']);
        });

        // Part 7 — Drip Sequences & Warmer
        Route::prefix('drip')->group(function () {
            // Sequences
            Route::get('/sequences', [DripSequenceController::class, 'index']);
            Route::post('/sequences', [DripSequenceController::class, 'store']);
            Route::get('/sequences/{id}', [DripSequenceController::class, 'show']);
            Route::put('/sequences/{id}', [DripSequenceController::class, 'update']);
            Route::delete('/sequences/{id}', [DripSequenceController::class, 'destroy']);
            Route::post('/sequences/{id}/duplicate', [DripSequenceController::class, 'duplicate']);

            // Steps (nested under sequence)
            Route::get('/sequences/{sequenceId}/steps', [DripStepController::class, 'index']);
            Route::post('/sequences/{sequenceId}/steps', [DripStepController::class, 'store']);
            Route::put('/sequences/{sequenceId}/steps/{id}', [DripStepController::class, 'update']);
            Route::delete('/sequences/{sequenceId}/steps/{id}', [DripStepController::class, 'destroy']);
            Route::post('/sequences/{sequenceId}/steps/reorder', [DripStepController::class, 'reorder']);

            // Enrollments
            Route::get('/sequences/{sequenceId}/enrollments', [DripEnrollmentController::class, 'index']);
            Route::post('/sequences/{sequenceId}/enroll', [DripEnrollmentController::class, 'enroll']);
            Route::post('/sequences/{sequenceId}/enroll-list', [DripEnrollmentController::class, 'enrollList']);
            Route::post('/sequences/{sequenceId}/bulk-action', [DripEnrollmentController::class, 'bulkAction']);
            Route::post('/sequences/{sequenceId}/enrollments/{id}/pause', [DripEnrollmentController::class, 'pause']);
            Route::post('/sequences/{sequenceId}/enrollments/{id}/resume', [DripEnrollmentController::class, 'resume']);
            Route::delete('/sequences/{sequenceId}/enrollments/{id}', [DripEnrollmentController::class, 'remove']);
        });

        Route::prefix('warmup')->group(function () {
            Route::get('/', [WarmupController::class, 'index']);
            Route::post('/start', [WarmupController::class, 'start']);
            Route::post('/{instanceId}/stop', [WarmupController::class, 'stop']);
            Route::get('/{instanceId}/status', [WarmupController::class, 'status']);
            Route::get('/{instanceId}/history', [WarmupController::class, 'history']);
        });

        // Part 8 — Groups & Templates
        Route::prefix('groups')->group(function () {
            // Placeholder: WhatsApp group management
        });

        Route::prefix('templates')->group(function () {
            // Placeholder: Message templates CRUD
        });
        // File Manager / Storage
        Route::prefix('media')->group(function () {
            Route::get('/', [MediaFileController::class, 'index']);
            Route::post('/', [MediaFileController::class, 'store']);
            Route::delete('/{id}', [MediaFileController::class, 'destroy']);
        });

        // AI Agent System
        Route::prefix('ai')->group(function () {
            // Global API key config
            Route::get('/config', [AiConfigController::class, 'show']);
            Route::post('/config', [AiConfigController::class, 'update']);

            // Agents CRUD
            Route::get('/agents', [AiAgentController::class, 'index']);
            Route::post('/agents', [AiAgentController::class, 'store']);
            Route::get('/agents/{id}', [AiAgentController::class, 'show']);
            Route::put('/agents/{id}', [AiAgentController::class, 'update']);
            Route::delete('/agents/{id}', [AiAgentController::class, 'destroy']);
            Route::post('/agents/{id}/playground', [AiAgentController::class, 'playground']);
            Route::delete('/agents/{id}/playground', [AiAgentController::class, 'clearPlayground']);

            // Knowledge Base (per agent)
            Route::get('/agents/{agentId}/knowledge', [AiKnowledgeController::class, 'index']);
            Route::post('/agents/{agentId}/knowledge', [AiKnowledgeController::class, 'store']);
            Route::delete('/agents/{agentId}/knowledge/{docId}', [AiKnowledgeController::class, 'destroy']);

            // Conversations (per agent)
            Route::get('/agents/{agentId}/conversations', [AiConversationController::class, 'index']);
            Route::get('/agents/{agentId}/conversations/{convId}', [AiConversationController::class, 'show']);
            Route::post('/agents/{agentId}/conversations/{convId}/resolve', [AiConversationController::class, 'resolve']);
            Route::delete('/agents/{agentId}/conversations/{convId}', [AiConversationController::class, 'destroy']);
        });
    });
});
