<?php
// database/migrations/2026_06_26_000002_create_plans_table.php

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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price_monthly', 10, 2);
            $table->decimal('price_yearly', 10, 2)->nullable();
            $table->integer('max_instances');
            $table->integer('max_messages_per_month');
            $table->integer('max_contacts');
            $table->integer('max_drip_sequences');
            $table->integer('max_chatbot_flows');
            $table->boolean('can_use_ai_chatbot')->default(false);
            $table->boolean('can_use_groups')->default(false);
            $table->boolean('can_use_warmer')->default(false);
            $table->boolean('can_use_api')->default(false);
            $table->boolean('can_white_label')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('plan_id')->references('id')->on('plans')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
        });

        Schema::dropIfExists('plans');
    }
};
