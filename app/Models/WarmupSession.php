<?php
// app/Models/WarmupSession.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarmupSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'instance_id',
        'partner_instance_id',
        'day_number',
        'target_messages',
        'sent_count',
        'status',
        'date',
    ];

    protected $casts = [
        'day_number' => 'integer',
        'target_messages' => 'integer',
        'sent_count' => 'integer',
        'date' => 'date',
    ];

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }

    public function partnerInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'partner_instance_id');
    }

    public function warmupMessages()
    {
        return $this->hasMany(WarmupMessage::class, 'warmup_session_id');
    }
}
