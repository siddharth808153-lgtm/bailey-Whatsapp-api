<?php
// app/Models/ContactListMember.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactListMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'contact_list_id',
        'contact_id',
    ];

    protected $casts = [
        'contact_list_id' => 'integer',
        'contact_id' => 'integer',
    ];

    public function contactList()
    {
        return $this->belongsTo(ContactList::class);
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }
}
