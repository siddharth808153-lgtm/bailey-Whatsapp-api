<?php
// app/Models/Plan.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price_monthly',
        'price_yearly',
        'max_instances',
        'max_messages_per_month',
        'max_contacts',
        'max_drip_sequences',
        'max_chatbot_flows',
        'can_use_ai_chatbot',
        'can_use_groups',
        'can_use_warmer',
        'can_use_api',
        'can_white_label',
        'is_active',
        'is_public',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:2',
        'price_yearly' => 'decimal:2',
        'max_instances' => 'integer',
        'max_messages_per_month' => 'integer',
        'max_contacts' => 'integer',
        'max_drip_sequences' => 'integer',
        'max_chatbot_flows' => 'integer',
        'can_use_ai_chatbot' => 'boolean',
        'can_use_groups' => 'boolean',
        'can_use_warmer' => 'boolean',
        'can_use_api' => 'boolean',
        'can_white_label' => 'boolean',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
