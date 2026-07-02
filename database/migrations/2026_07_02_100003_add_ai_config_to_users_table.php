<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('ai_provider', ['openai', 'gemini', 'anthropic'])->nullable()->after('remember_token');
            $table->string('ai_api_key')->nullable()->after('ai_provider');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['ai_provider', 'ai_api_key']);
        });
    }
};
