<?php
// database/migrations/2026_06_26_000017_create_drip_message_logs_table.php

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
        Schema::create('drip_message_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('drip_enrollments')->onDelete('cascade');
            $table->foreignId('step_id')->constrained('drip_steps')->onDelete('cascade');
            $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
            $table->foreignId('instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->enum('status', ['sent', 'failed', 'skipped']);
            $table->string('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('drip_message_logs');
    }
};
