<?php
// app/Models/DripMessageLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DripMessageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrollment_id',
        'step_id',
        'contact_id',
        'instance_id',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function dripEnrollment()
    {
        return $this->belongsTo(DripEnrollment::class, 'enrollment_id');
    }

    public function dripStep()
    {
        return $this->belongsTo(DripStep::class, 'step_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }
}
