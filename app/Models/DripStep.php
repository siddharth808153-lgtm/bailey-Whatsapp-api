<?php
// app/Models/DripStep.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DripStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'sequence_id',
        'step_number',
        'name',
        'message_type',
        'message_body',
        'media_url',
        'wait_days',
        'wait_hours',
        'send_time',
    ];

    protected $casts = [
        'step_number' => 'integer',
        'wait_days' => 'integer',
        'wait_hours' => 'integer',
    ];

    public function dripSequence()
    {
        return $this->belongsTo(DripSequence::class, 'sequence_id');
    }
}
