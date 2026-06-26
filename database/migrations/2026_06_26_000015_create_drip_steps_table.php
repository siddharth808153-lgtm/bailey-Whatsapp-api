<?php
// database/migrations/2026_06_26_000015_create_drip_steps_table.php

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
        Schema::create('drip_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sequence_id')->constrained('drip_sequences')->onDelete('cascade');
            $table->integer('step_number');
            $table->string('name')->nullable();
            $table->enum('message_type', ['text', 'image', 'video', 'document']);
            $table->text('message_body');
            $table->string('media_url')->nullable();
            $table->integer('wait_days')->default(1);
            $table->integer('wait_hours')->default(0);
            $table->time('send_time')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('drip_steps');
    }
};
