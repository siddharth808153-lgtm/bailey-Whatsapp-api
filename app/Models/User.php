<?php
// app/Models/User.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'reseller_id',
        'plan_id',
        'is_active',
        'email_verified_at',
        'trial_ends_at',
        'last_login_at',
        'ai_provider',
        'ai_api_key',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'ai_api_key',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'last_login_at' => 'datetime',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    /**
     * Get the plan associated with the user.
     */
    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * Get the reseller that owns this user.
     */
    public function reseller()
    {
        return $this->belongsTo(User::class, 'reseller_id');
    }

    /**
     * Get the clients owned by this reseller user.
     */
    public function clients()
    {
        return $this->hasMany(User::class, 'reseller_id');
    }

    /**
     * Get the WhatsApp instances for the user.
     */
    public function whatsappInstances()
    {
        return $this->hasMany(WhatsappInstance::class);
    }

    /**
     * Get the contacts for the user.
     */
    public function contacts()
    {
        return $this->hasMany(Contact::class);
    }

    /**
     * Get the contact lists for the user.
     */
    public function contactLists()
    {
        return $this->hasMany(ContactList::class);
    }

    /**
     * Get the campaigns for the user.
     */
    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }

    /**
     * Get the chatbot flows for the user.
     */
    public function chatbotFlows()
    {
        return $this->hasMany(ChatbotFlow::class);
    }

    /**
     * Get the drip sequences for the user.
     */
    public function dripSequences()
    {
        return $this->hasMany(DripSequence::class);
    }

    /**
     * Get the reseller setting associated with the user.
     */
    public function resellerSetting()
    {
        return $this->hasOne(ResellerSetting::class);
    }

    /**
     * Get the subscriptions for the user.
     */
    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Get the API keys for the user.
     */
    public function apiKeys()
    {
        return $this->hasMany(ApiKey::class);
    }

    /**
     * Get the AI agents for the user.
     */
    public function aiAgents()
    {
        return $this->hasMany(AiAgent::class);
    }
}
