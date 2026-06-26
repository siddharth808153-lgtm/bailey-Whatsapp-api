<?php
// database/migrations/2026_06_26_000008_create_message_templates_table.php

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
        Schema::create('message_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->enum('category', ['promotional', 'transactional', 'greeting', 'follow_up', 'other']);
            $table->enum('message_type', ['text', 'image', 'video', 'document', 'audio']);
            $table->text('body');
            $table->string('media_url')->nullable();
            $table->string('media_filename')->nullable();
            $table->string('footer')->nullable();
            $table->boolean('has_buttons')->default(false);
            $table->json('buttons')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_templates');
    }
};
