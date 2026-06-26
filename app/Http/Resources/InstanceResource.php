<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InstanceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Excludes sensitive session data.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'phone_number' => $this->phone_number,
            'status' => $this->status,
            'webhook_url' => $this->webhook_url,
            'is_warmed' => $this->is_warmed,
            'warmup_started_at' => $this->warmup_started_at?->toIso8601String(),
            'warmup_completed_at' => $this->warmup_completed_at?->toIso8601String(),
            'last_connected_at' => $this->last_connected_at?->toIso8601String(),
            'last_disconnected_at' => $this->last_disconnected_at?->toIso8601String(),
            'daily_message_limit' => $this->daily_message_limit,
            'messages_sent_today' => $this->messages_sent_today,
            'messages_sent_this_month' => $this->messages_sent_this_month,
            'last_message_sent_at' => $this->last_message_sent_at?->toIso8601String(),
            'is_active' => $this->is_active,
            'is_connected' => $this->status === 'connected',
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
