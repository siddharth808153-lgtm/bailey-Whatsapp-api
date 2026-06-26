<?php
// app/Models/MessageLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MessageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'instance_id',
        'source_type',
        'source_id',
        'to_phone',
        'message_type',
        'message_body',
        'media_url',
        'status',
        'error_message',
        'sent_at',
        'delivered_at',
        'read_at',
    ];

    protected $casts = [
        'source_id' => 'integer',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }
}
