<?php
// database/migrations/2026_06_26_000012_create_chatbot_rules_table.php

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
        Schema::create('chatbot_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flow_id')->constrained('chatbot_flows')->onDelete('cascade');
            $table->string('trigger_keyword')->nullable();
            $table->enum('match_type', ['exact', 'contains', 'starts_with', 'regex']);
            $table->boolean('is_default')->default(false);
            $table->enum('response_type', ['text', 'image', 'video', 'document', 'flow']);
            $table->text('response_body')->nullable();
            $table->string('response_media_url')->nullable();
            $table->foreignId('next_flow_id')->nullable()->constrained('chatbot_flows')->onDelete('set null');
            $table->boolean('simulate_typing')->default(true);
            $table->integer('typing_delay_seconds')->default(2);
            $table->integer('priority')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_rules');
    }
};
