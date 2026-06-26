<?php
// database/migrations/2026_06_26_000021_create_reseller_settings_table.php

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
        Schema::create('reseller_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('business_name')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('custom_domain')->nullable();
            $table->string('primary_color')->nullable()->default('#2563EB');
            $table->string('support_email')->nullable();
            $table->string('support_phone')->nullable();
            $table->decimal('markup_percentage', 5, 2)->default(0.00);
            $table->decimal('credit_balance', 10, 2)->default(0.00);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reseller_settings');
    }
};
