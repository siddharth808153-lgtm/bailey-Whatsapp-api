<?php
// database/migrations/2026_06_26_000009_create_campaigns_table.php

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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('instance_id')->constrained('whatsapp_instances')->onDelete('cascade');
            $table->string('name');
            $table->enum('status', ['draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'cancelled']);
            $table->enum('message_type', ['text', 'image', 'video', 'document', 'audio']);
            $table->text('message_body');
            $table->string('media_url')->nullable();
            $table->string('media_filename')->nullable();
            $table->string('footer')->nullable();
            $table->json('buttons')->nullable();
            $table->foreignId('contact_list_id')->nullable()->constrained('contact_lists')->onDelete('set null');
            $table->json('custom_contacts')->nullable();
            $table->integer('total_contacts')->default(0);
            $table->integer('sent_count')->default(0);
            $table->integer('delivered_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->integer('min_delay_seconds')->default(5);
            $table->integer('max_delay_seconds')->default(15);
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
