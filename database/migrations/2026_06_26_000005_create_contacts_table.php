<?php
// database/migrations/2026_06_26_000005_create_contacts_table.php

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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('custom1')->nullable();
            $table->string('custom2')->nullable();
            $table->string('custom3')->nullable();
            $table->boolean('is_opted_out')->default(false);
            $table->timestamp('opted_out_at')->nullable();
            $table->boolean('is_invalid')->default(false);
            $table->json('tags')->nullable();
            $table->timestamp('last_messaged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->unique(['user_id', 'phone']);
            $table->index(['user_id', 'is_opted_out']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
