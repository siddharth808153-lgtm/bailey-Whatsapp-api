<?php
// app/Models/ApiKey.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'key',
        'last_used_at',
        'expires_at',
        'is_active',
        'permissions',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
        'permissions' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
