<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappInstance;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GroupController extends Controller
{
    use ApiResponse;

    protected $nodeUrl;
    protected $nodeSecret;

    public function __construct()
    {
        $this->nodeUrl = config('wasp.node_service_url');
        $this->nodeSecret = config('wasp.node_service_secret');
    }

    /**
     * Helper to call the Node.js microservice.
     */
    private function makeNodeRequest(string $method, string $path, array $data = [])
    {
        try {
            $url = rtrim($this->nodeUrl, '/') . '/groups/' . ltrim($path, '/');
            $response = Http::withHeaders([
                'X-Service-Secret' => $this->nodeSecret,
                'Content-Type' => 'application/json',
            ])->timeout(15)->send($method, $url, [
                'json' => $data,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error("Node.js group service error {$response->status()}: " . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error("Connection to Node.js group service failed at {$path}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch the user's instance and verify ownership.
     */
    private function getVerifiedInstance(Request $request)
    {
        $instanceId = $request->input('instance_id') ?? $request->query('instance_id');

        if (!$instanceId) {
            abort(422, 'instance_id is required');
        }

        $instance = auth()->user()->whatsappInstances()->findOrFail($instanceId);

        if ($instance->status !== 'connected') {
            abort(400, 'WhatsApp instance is not connected.');
        }

        return $instance;
    }

    /**
     * List all groups the connected instance is part of.
     * GET /api/groups?instance_id=xxx
     */
    public function index(Request $request)
    {
        try {
            $instance = $this->getVerifiedInstance($request);
            $response = $this->makeNodeRequest('GET', "{$instance->session_id}/list");

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success($response['data']);
            }

            return $this->error('Failed to retrieve groups from WhatsApp service.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new group.
     * POST /api/groups
     * Body: { instance_id, title, participants: [...] }
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'instance_id' => 'required',
                'title' => 'required|string|max:100',
                'participants' => 'required|array|min:1',
                'participants.*' => 'required|string',
            ]);

            $instance = $this->getVerifiedInstance($request);

            $response = $this->makeNodeRequest('POST', 'create', [
                'session_id' => $instance->session_id,
                'title' => $request->title,
                'participants' => $request->participants,
            ]);

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success($response['data'], 'Group created successfully.', 201);
            }

            return $this->error($response['message'] ?? 'Failed to create group.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * List participants of a group.
     * GET /api/groups/{groupId}/participants?instance_id=xxx
     */
    public function participants(Request $request, $groupId)
    {
        try {
            $instance = $this->getVerifiedInstance($request);
            $response = $this->makeNodeRequest('GET', "{$instance->session_id}/{$groupId}/participants");

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success($response['data']);
            }

            return $this->error('Failed to retrieve participants.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Add, remove, promote, or demote participants.
     * POST /api/groups/{groupId}/participants
     * Body: { instance_id, participants: [...], action: 'add'|'remove'|'promote'|'demote' }
     */
    public function updateParticipants(Request $request, $groupId)
    {
        try {
            $request->validate([
                'instance_id' => 'required',
                'participants' => 'required|array|min:1',
                'participants.*' => 'required|string',
                'action' => 'required|in:add,remove,promote,demote',
            ]);

            $instance = $this->getVerifiedInstance($request);

            $response = $this->makeNodeRequest('POST', 'participants/update', [
                'session_id' => $instance->session_id,
                'group_id' => $groupId,
                'participants' => $request->participants,
                'action' => $request->action,
            ]);

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success($response['data'], 'Participants updated successfully.');
            }

            return $this->error($response['message'] ?? 'Failed to update participants.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Retrieve or generate group invite link.
     * GET /api/groups/{groupId}/invite?instance_id=xxx
     */
    public function inviteCode(Request $request, $groupId)
    {
        try {
            $instance = $this->getVerifiedInstance($request);
            $response = $this->makeNodeRequest('GET', "{$instance->session_id}/{$groupId}/invite-code");

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success($response['data']);
            }

            return $this->error('Failed to get invite link.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Revoke group invite link.
     * POST /api/groups/{groupId}/invite/revoke
     * Body: { instance_id }
     */
    public function revokeInviteCode(Request $request, $groupId)
    {
        try {
            $request->validate(['instance_id' => 'required']);
            $instance = $this->getVerifiedInstance($request);

            $response = $this->makeNodeRequest('POST', 'invite-code/revoke', [
                'session_id' => $instance->session_id,
                'group_id' => $groupId,
            ]);

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success($response['data'], 'Invite link revoked successfully.');
            }

            return $this->error($response['message'] ?? 'Failed to revoke invite link.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update group settings.
     * POST /api/groups/{groupId}/settings
     * Body: { instance_id, setting: 'announcement'|'not_announcement'|'locked'|'unlocked' }
     */
    public function updateSetting(Request $request, $groupId)
    {
        try {
            $request->validate([
                'instance_id' => 'required',
                'setting' => 'required|in:announcement,not_announcement,locked,unlocked',
            ]);

            $instance = $this->getVerifiedInstance($request);

            $response = $this->makeNodeRequest('POST', 'setting', [
                'session_id' => $instance->session_id,
                'group_id' => $groupId,
                'setting' => $request->setting,
            ]);

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success(null, 'Group settings updated successfully.');
            }

            return $this->error($response['message'] ?? 'Failed to update settings.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Leave a group.
     * POST /api/groups/{groupId}/leave
     * Body: { instance_id }
     */
    public function leaveGroup(Request $request, $groupId)
    {
        try {
            $request->validate(['instance_id' => 'required']);
            $instance = $this->getVerifiedInstance($request);

            $response = $this->makeNodeRequest('POST', 'leave', [
                'session_id' => $instance->session_id,
                'group_id' => $groupId,
            ]);

            if ($response && isset($response['success']) && $response['success']) {
                return $this->success(null, 'Left group successfully.');
            }

            return $this->error($response['message'] ?? 'Failed to leave group.', 502);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Exception $e) {
            return $this->error('An error occurred: ' . $e->getMessage(), 500);
        }
    }
}
