<?php
// database/migrations/2026_06_26_000020_create_message_logs_table.php

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
        Schema::create('message_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->enum('source_type', ['campaign', 'drip', 'chatbot', 'manual', 'warmup', 'api']);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('to_phone');
            $table->enum('message_type', ['text', 'image', 'video', 'document', 'audio', 'sticker', 'location']);
            $table->text('message_body')->nullable();
            $table->string('media_url')->nullable();
            $table->enum('status', ['queued', 'sent', 'delivered', 'failed', 'read']);
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps(); // permanent record, no softDeletes

            // Indexes
            $table->index(['user_id', 'sent_at']);
            $table->index(['instance_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_logs');
    }
};
