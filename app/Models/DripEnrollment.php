<?php
// app/Models/DripEnrollment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DripEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'sequence_id',
        'contact_id',
        'instance_id',
        'current_step',
        'status',
        'enrolled_at',
        'next_message_at',
        'completed_at',
    ];

    protected $casts = [
        'current_step' => 'integer',
        'enrolled_at' => 'datetime',
        'next_message_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function dripSequence()
    {
        return $this->belongsTo(DripSequence::class, 'sequence_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }

    public function dripMessageLogs()
    {
        return $this->hasMany(DripMessageLog::class, 'enrollment_id');
    }

    /**
     * Scope a query to only include active enrollments that are scheduled to send.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                     ->where('next_message_at', '<=', now());
    }
}
