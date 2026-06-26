<?php
// app/Models/ChatbotConversation.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotConversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'instance_id',
        'contact_phone',
        'flow_id',
        'current_rule_id',
        'state',
        'last_message_at',
        'is_active',
    ];

    protected $casts = [
        'state' => 'array',
        'last_message_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }

    public function chatbotFlow()
    {
        return $this->belongsTo(ChatbotFlow::class, 'flow_id');
    }

    public function chatbotRule()
    {
        return $this->belongsTo(ChatbotRule::class, 'current_rule_id');
    }
}
