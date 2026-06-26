<?php
// database/migrations/2026_06_26_000018_create_warmup_sessions_table.php

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
        Schema::create('warmup_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->foreignId('partner_instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->integer('day_number');
            $table->integer('target_messages');
            $table->integer('sent_count')->default(0);
            $table->enum('status', ['pending', 'running', 'completed', 'failed']);
            $table->date('date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warmup_sessions');
    }
};
