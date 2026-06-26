<?php
// database/migrations/2026_06_26_000004_create_whatsapp_instances_table.php

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
        Schema::create('whatsapp_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('phone_number')->nullable();
            $table->enum('status', ['disconnected', 'connecting', 'qr_ready', 'connected', 'banned', 'logged_out'])->default('disconnected');
            $table->string('session_id')->unique();
            $table->string('webhook_url')->nullable();
            $table->boolean('is_warmed')->default(false);
            $table->timestamp('warmup_started_at')->nullable();
            $table->timestamp('warmup_completed_at')->nullable();
            $table->timestamp('last_connected_at')->nullable();
            $table->timestamp('last_disconnected_at')->nullable();
            $table->integer('daily_message_limit')->default(200);
            $table->integer('messages_sent_today')->default(0);
            $table->integer('messages_sent_this_month')->default(0);
            $table->timestamp('last_message_sent_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_instances');
    }
};
