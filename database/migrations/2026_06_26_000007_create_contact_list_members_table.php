<?php
// database/migrations/2026_06_26_000007_create_contact_list_members_table.php

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
        Schema::create('contact_list_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_list_id')->constrained('contact_lists')->onDelete('cascade');
            $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
            $table->timestamps();

            // Unique index
            $table->unique(['contact_list_id', 'contact_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_list_members');
    }
};
