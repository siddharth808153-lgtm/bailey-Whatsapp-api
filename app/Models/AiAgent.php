<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AiAgent extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'system_prompt',
        'temperature',
        'max_tokens',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'temperature' => 'float',
        'max_tokens' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function knowledgeDocs()
    {
        return $this->hasMany(AiKnowledgeDoc::class, 'agent_id');
    }

    public function conversations()
    {
        return $this->hasMany(AiConversation::class, 'agent_id');
    }

    public function chatbotFlows()
    {
        return $this->hasMany(ChatbotFlow::class, 'agent_id');
    }
}
