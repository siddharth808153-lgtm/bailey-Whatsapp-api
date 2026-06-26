<?php
// app/Models/WarmupMessage.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarmupMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'warmup_session_id',
        'from_instance_id',
        'to_instance_id',
        'message_body',
        'sent_at',
        'status',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function warmupSession()
    {
        return $this->belongsTo(WarmupSession::class, 'warmup_session_id');
    }

    public function fromInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'from_instance_id');
    }

    public function toInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'to_instance_id');
    }
}
