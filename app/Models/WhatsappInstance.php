<?php
// app/Models/WhatsappInstance.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WhatsappInstance extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'phone_number',
        'status',
        'session_id',
        'webhook_url',
        'is_warmed',
        'warmup_started_at',
        'warmup_completed_at',
        'last_connected_at',
        'last_disconnected_at',
        'daily_message_limit',
        'messages_sent_today',
        'messages_sent_this_month',
        'last_message_sent_at',
        'is_active',
    ];

    protected $casts = [
        'is_warmed' => 'boolean',
        'warmup_started_at' => 'datetime',
        'warmup_completed_at' => 'datetime',
        'last_connected_at' => 'datetime',
        'last_disconnected_at' => 'datetime',
        'daily_message_limit' => 'integer',
        'messages_sent_today' => 'integer',
        'messages_sent_this_month' => 'integer',
        'last_message_sent_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class, 'instance_id');
    }

    public function chatbotFlows()
    {
        return $this->hasMany(ChatbotFlow::class, 'instance_id');
    }

    public function dripSequences()
    {
        return $this->hasMany(DripSequence::class, 'instance_id');
    }

    public function warmupSessions()
    {
        return $this->hasMany(WarmupSession::class, 'instance_id');
    }

    public function messageLogs()
    {
        return $this->hasMany(MessageLog::class, 'instance_id');
    }

    /**
     * Scope a query to only include connected instances.
     */
    public function scopeConnected($query)
    {
        return $query->where('status', 'connected');
    }

    /**
     * Scope a query to only include active instances.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
