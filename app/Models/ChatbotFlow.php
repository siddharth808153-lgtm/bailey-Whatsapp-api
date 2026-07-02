<?php
// app/Models/ChatbotFlow.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatbotFlow extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'instance_id',
        'name',
        'is_active',
        'trigger_type',
        'business_hours_only',
        'business_hours_start',
        'business_hours_end',
        'away_message',
        'use_ai',
        'ai_provider',
        'ai_api_key',
        'ai_system_prompt',
        'agent_id',
    ];

    protected $hidden = [
        'ai_api_key',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'business_hours_only' => 'boolean',
        'use_ai' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }

    public function chatbotRules()
    {
        return $this->hasMany(ChatbotRule::class, 'flow_id');
    }

    public function chatbotConversations()
    {
        return $this->hasMany(ChatbotConversation::class, 'flow_id');
    }

    public function aiAgent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_id');
    }
}
