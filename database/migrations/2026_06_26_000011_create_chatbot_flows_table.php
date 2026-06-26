<?php
// database/migrations/2026_06_26_000011_create_chatbot_flows_table.php

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
        Schema::create('chatbot_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('instance_id')->nullable()->constrained('whatsapp_instances')->onDelete('set null');
            $table->string('name');
            $table->boolean('is_active')->default(false);
            $table->enum('trigger_type', ['keyword', 'any_message', 'first_message']);
            $table->boolean('business_hours_only')->default(false);
            $table->time('business_hours_start')->nullable();
            $table->time('business_hours_end')->nullable();
            $table->text('away_message')->nullable();
            $table->boolean('use_ai')->default(false);
            $table->enum('ai_provider', ['openai', 'gemini', 'anthropic'])->nullable();
            $table->string('ai_api_key')->nullable();
            $table->text('ai_system_prompt')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_flows');
    }
};
