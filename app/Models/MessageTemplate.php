<?php
// app/Models/MessageTemplate.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MessageTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'category',
        'message_type',
        'body',
        'media_url',
        'media_filename',
        'footer',
        'has_buttons',
        'buttons',
    ];

    protected $casts = [
        'has_buttons' => 'boolean',
        'buttons' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
