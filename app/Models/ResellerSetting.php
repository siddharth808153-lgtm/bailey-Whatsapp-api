<?php
// app/Models/ResellerSetting.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResellerSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'business_name',
        'logo_url',
        'custom_domain',
        'primary_color',
        'support_email',
        'support_phone',
        'markup_percentage',
        'credit_balance',
    ];

    protected $casts = [
        'markup_percentage' => 'decimal:2',
        'credit_balance' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
