<?php
// app/Http/Controllers/Api/InstanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\PlanCheck;
use App\Services\PlanService;
use App\Models\WhatsappInstance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class InstanceController extends Controller
{
    protected $planService;
    protected $nodeUrl;
    protected $nodeSecret;

    public function __construct(PlanService $planService)
    {
        $this->planService = $planService;
        $this->nodeUrl = config('wasp.node_service_url');
        $this->nodeSecret = config('wasp.node_service_secret');
    }

    /**
     * Helper to make authenticated HTTP requests to the Node.js service.
     */
    private function makeNodeRequest(string $method, string $path, array $data = [])
    {
        try {
            $url = rtrim($this->nodeUrl, '/') . '/' . ltrim($path, '/');
            $response = Http::withHeaders([
                'X-Service-Secret' => $this->nodeSecret,
                'Content-Type' => 'application/json',
            ])->timeout(12)->send($method, $url, [
                'json' => $data,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error("Node.js service returned error status {$response->status()}: " . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error("Failed to connect to Node.js service at {$path}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * List user's instances with live status merged from Node.js.
     */
    public function index()
    {
        $user = auth()->user();
        $instances = $user->whatsappInstances;

        // Fetch all live instances status in a single call to optimize performance
        $liveData = $this->makeNodeRequest('GET', '/api/instance/all');
        $liveMap = [];

        if ($liveData && isset($liveData['success']) && $liveData['success'] && isset($liveData['data'])) {
            foreach ($liveData['data'] as $liveInst) {
                $liveMap[$liveInst['session_id']] = $liveInst;
            }
        }

        $formatted = $instances->map(function ($instance) use ($liveMap) {
            $live = $liveMap[$instance->session_id] ?? null;

            return [
                'id' => $instance->id,
                'name' => $instance->name,
                'phone_number' => $instance->phone_number,
                'session_id' => $instance->session_id,
                'webhook_url' => $instance->webhook_url,
                'is_active' => (bool) $instance->is_active,
                'is_warmed' => (bool) $instance->is_warmed,
                'daily_limit' => $instance->daily_message_limit,
                'sent_today' => $instance->messages_sent_today,
                'sent_this_month' => $instance->messages_sent_this_month,
                // Status resolved from live Node.js state, fallback to database state
                'status' => $live ? $live['status'] : $instance->status,
                'connected_at' => $instance->last_connected_at,
                'disconnected_at' => $instance->last_disconnected_at,
                'queue_size' => $live ? ($live['queue_size'] ?? 0) : 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Create a new WhatsApp connection instance.
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        // 1. Verify plan capability limits
        PlanCheck::or403(
            $this->planService->canAddInstance($user),
            'Add WhatsApp Instance'
        );

        $request->validate([
            'name' => 'required|string|max:100',
            'webhook_url' => 'nullable|url|max:255',
        ]);

        $sessionId = 'wasp_' . Str::uuid()->toString();

        // 2. Create Instance record in Database
        $instance = $user->whatsappInstances()->create([
            'name' => $request->name,
            'session_id' => $sessionId,
            'status' => 'disconnected',
            'webhook_url' => $request->webhook_url,
            'is_active' => true,
            'daily_message_limit' => 200,
            'messages_sent_today' => 0,
            'messages_sent_this_month' => 0,
        ]);

        // 3. Request Node.js service to connect/initialize Baileys socket
        $nodeResult = $this->makeNodeRequest('POST', '/api/instance/connect', [
            'session_id' => $sessionId,
        ]);

        $liveStatus = 'connecting';
        if ($nodeResult && isset($nodeResult['success']) && $nodeResult['success']) {
            $liveStatus = $nodeResult['data']['status'] ?? 'connecting';
        }

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp instance created successfully and is connecting.',
            'data' => array_merge($instance->toArray(), [
                'status' => $liveStatus,
            ]),
        ], 201);
    }

    /**
     * Get single WhatsApp instance with its detailed live status (like QR code image).
     */
    public function show($id)
    {
        $instance = auth()->user()->whatsappInstances()->findOrFail($id);

        // Fetch live state from Node.js
        $liveData = $this->makeNodeRequest('GET', "/api/instance/status/{$instance->session_id}");

        $response = [
            'id' => $instance->id,
            'name' => $instance->name,
            'phone_number' => $instance->phone_number,
            'session_id' => $instance->session_id,
            'webhook_url' => $instance->webhook_url,
            'is_active' => (bool) $instance->is_active,
            'is_warmed' => (bool) $instance->is_warmed,
            'daily_limit' => $instance->daily_message_limit,
            'sent_today' => $instance->messages_sent_today,
            'sent_this_month' => $instance->messages_sent_this_month,
            'status' => $instance->status,
            'qr_code' => null,
            'qr_image' => null,
            'connected_at' => $instance->last_connected_at,
            'disconnected_at' => $instance->last_disconnected_at,
            'queue' => [
                'size' => 0,
                'pending' => 0,
                'is_paused' => false,
            ],
        ];

        if ($liveData && isset($liveData['success']) && $liveData['success'] && isset($liveData['data'])) {
            $live = $liveData['data'];
            $response['status'] = $live['status'];
            $response['qr_code'] = $live['qr'];
            $response['qr_image'] = $live['qr_image'];
            if (isset($live['queue_stats'])) {
                $response['queue'] = [
                    'size' => $live['queue_stats']['size'] ?? 0,
                    'pending' => $live['queue_stats']['pending'] ?? 0,
                    'is_paused' => $live['queue_stats']['isPaused'] ?? false,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $response,
        ]);
    }

    /**
     * Trigger manual reconnect.
     */
    public function connect($id)
    {
        $instance = auth()->user()->whatsappInstances()->findOrFail($id);

        $nodeResult = $this->makeNodeRequest('POST', '/api/instance/connect', [
            'session_id' => $instance->session_id,
        ]);

        if (!$nodeResult || !isset($nodeResult['success']) || !$nodeResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to connect. Please check Node.js microservice.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Connection requested successfully.',
        ]);
    }

    /**
     * Disconnect instance socket temporarily.
     */
    public function disconnect($id)
    {
        $instance = auth()->user()->whatsappInstances()->findOrFail($id);

        $nodeResult = $this->makeNodeRequest('POST', '/api/instance/disconnect', [
            'session_id' => $instance->session_id,
        ]);

        if (!$nodeResult || !isset($nodeResult['success']) || !$nodeResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to disconnect.',
            ], 500);
        }

        $instance->status = 'disconnected';
        $instance->last_disconnected_at = now();
        $instance->save();

        return response()->json([
            'success' => true,
            'message' => 'Disconnected successfully.',
        ]);
    }

    /**
     * Log out completely and clear device registration.
     */
    public function logout($id)
    {
        $instance = auth()->user()->whatsappInstances()->findOrFail($id);

        $nodeResult = $this->makeNodeRequest('POST', '/api/instance/logout', [
            'session_id' => $instance->session_id,
        ]);

        if (!$nodeResult || !isset($nodeResult['success']) || !$nodeResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to log out.',
            ], 500);
        }

        $instance->status = 'disconnected';
        $instance->phone_number = null;
        $instance->last_disconnected_at = now();
        $instance->save();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully. You can now scan a new QR code.',
        ]);
    }

    /**
     * Delete instance from DB and wipe credentials folder on Node.js service.
     */
    public function destroy($id)
    {
        $instance = auth()->user()->whatsappInstances()->findOrFail($id);

        // Wipe session on Node.js side
        $this->makeNodeRequest('POST', '/api/instance/logout', [
            'session_id' => $instance->session_id,
        ]);

        $instance->delete(); // Soft deletes the database record

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp instance deleted successfully.',
        ]);
    }
}
