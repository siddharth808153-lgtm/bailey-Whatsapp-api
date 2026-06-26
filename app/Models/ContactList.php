<?php
// app/Models/ContactList.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContactList extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'contact_count',
    ];

    protected $casts = [
        'contact_count' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function contacts()
    {
        return $this->belongsToMany(Contact::class, 'contact_list_members', 'contact_list_id', 'contact_id')
                    ->withTimestamps();
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }
}
