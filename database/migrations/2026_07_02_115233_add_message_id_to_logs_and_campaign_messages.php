<?php

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
        Schema::table('message_logs', function (Blueprint $table) {
            $table->string('message_id')->nullable()->after('instance_id');
            $table->index('message_id');
        });

        Schema::table('campaign_messages', function (Blueprint $table) {
            $table->string('message_id')->nullable()->after('instance_id');
            $table->index('message_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('message_logs', function (Blueprint $table) {
            $table->dropIndex(['message_id']);
            $table->dropColumn('message_id');
        });

        Schema::table('campaign_messages', function (Blueprint $table) {
            $table->dropIndex(['message_id']);
            $table->dropColumn('message_id');
        });
    }
};
