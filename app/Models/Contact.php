<?php
// app/Models/Contact.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'custom1',
        'custom2',
        'custom3',
        'is_opted_out',
        'opted_out_at',
        'is_invalid',
        'tags',
        'last_messaged_at',
    ];

    protected $casts = [
        'is_opted_out' => 'boolean',
        'opted_out_at' => 'datetime',
        'is_invalid' => 'boolean',
        'tags' => 'array',
        'last_messaged_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function contactLists()
    {
        return $this->belongsToMany(ContactList::class, 'contact_list_members', 'contact_id', 'contact_list_id')
                    ->withTimestamps();
    }

    public function campaignMessages()
    {
        return $this->hasMany(CampaignMessage::class);
    }

    public function dripEnrollments()
    {
        return $this->hasMany(DripEnrollment::class);
    }

    /**
     * Scope a query to only include active contacts.
     */
    public function scopeActive($query)
    {
        return $query->where('is_opted_out', false)
                     ->where('is_invalid', false);
    }
}
