<?php
// database/migrations/2026_06_26_000019_create_warmup_messages_table.php

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
        Schema::create('warmup_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warmup_session_id')->constrained('warmup_sessions')->onDelete('cascade');
            $table->foreignId('from_instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->foreignId('to_instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->text('message_body');
            $table->timestamp('sent_at')->nullable();
            $table->enum('status', ['sent', 'failed']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warmup_messages');
    }
};
