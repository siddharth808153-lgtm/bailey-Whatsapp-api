<?php
// database/migrations/2026_06_26_000013_create_chatbot_conversations_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chatbot_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->string('contact_phone');
            $table->foreignId('flow_id')->nullable()->constrained('chatbot_flows')->onDelete('set null');
            $table->foreignId('current_rule_id')->nullable()->constrained('chatbot_rules')->onDelete('set null');
            $table->json('state')->nullable();
            $table->timestamp('last_message_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Indexes
            $table->index(['instance_id', 'contact_phone', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_conversations');
    }
};
