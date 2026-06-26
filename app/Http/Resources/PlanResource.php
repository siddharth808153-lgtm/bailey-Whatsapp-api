<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price_monthly' => $this->price_monthly,
            'price_monthly_formatted' => '₹' . number_format((float) $this->price_monthly, 2),
            'price_yearly' => $this->price_yearly,
            'price_yearly_formatted' => '₹' . number_format((float) $this->price_yearly, 2),
            'max_instances' => $this->max_instances,
            'max_messages_per_month' => $this->max_messages_per_month,
            'max_contacts' => $this->max_contacts,
            'max_drip_sequences' => $this->max_drip_sequences,
            'max_chatbot_flows' => $this->max_chatbot_flows,
            'can_use_ai_chatbot' => $this->can_use_ai_chatbot,
            'can_use_groups' => $this->can_use_groups,
            'can_use_warmer' => $this->can_use_warmer,
            'can_use_api' => $this->can_use_api,
            'can_white_label' => $this->can_white_label,
            'is_active' => $this->is_active,
            'is_public' => $this->is_public,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
