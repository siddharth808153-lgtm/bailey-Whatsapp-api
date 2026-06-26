<?php
// app/Models/Campaign.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campaign extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'instance_id',
        'name',
        'status',
        'message_type',
        'message_body',
        'media_url',
        'media_filename',
        'footer',
        'buttons',
        'contact_list_id',
        'custom_contacts',
        'total_contacts',
        'sent_count',
        'delivered_count',
        'failed_count',
        'min_delay_seconds',
        'max_delay_seconds',
        'scheduled_at',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'buttons' => 'array',
        'custom_contacts' => 'array',
        'total_contacts' => 'integer',
        'sent_count' => 'integer',
        'delivered_count' => 'integer',
        'failed_count' => 'integer',
        'min_delay_seconds' => 'integer',
        'max_delay_seconds' => 'integer',
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function whatsappInstance()
    {
        return $this->belongsTo(WhatsappInstance::class, 'instance_id');
    }

    public function contactList()
    {
        return $this->belongsTo(ContactList::class);
    }

    public function campaignMessages()
    {
        return $this->hasMany(CampaignMessage::class);
    }

    /**
     * Scope a query to only include running campaigns.
     */
    public function scopeRunning($query)
    {
        return $query->where('status', 'running');
    }

    /**
     * Scope a query to only include scheduled campaigns that are ready to run.
     */
    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled')
                     ->where('scheduled_at', '<=', now());
    }
}
