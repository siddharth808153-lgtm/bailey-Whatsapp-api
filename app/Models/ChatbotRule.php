<?php
// app/Models/ChatbotRule.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'flow_id',
        'trigger_keyword',
        'match_type',
        'is_default',
        'response_type',
        'response_body',
        'response_media_url',
        'next_flow_id',
        'simulate_typing',
        'typing_delay_seconds',
        'priority',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'simulate_typing' => 'boolean',
        'typing_delay_seconds' => 'integer',
        'priority' => 'integer',
    ];

    public function chatbotFlow()
    {
        return $this->belongsTo(ChatbotFlow::class, 'flow_id');
    }

    public function nextFlow()
    {
        return $this->belongsTo(ChatbotFlow::class, 'next_flow_id');
    }
}
