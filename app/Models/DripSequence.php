<?php
// app/Models/DripSequence.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DripSequence extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'instance_id',
        'name',
        'status',
        'description',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }

    public function dripSteps()
    {
        return $this->hasMany(DripStep::class, 'sequence_id')->orderBy('step_number');
    }

    public function dripEnrollments()
    {
        return $this->hasMany(DripEnrollment::class, 'sequence_id');
    }
}
