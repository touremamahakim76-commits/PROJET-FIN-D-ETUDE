<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('densites', function (Blueprint $table) {
            $table->string('jour_type', 10)->default('JOHV')->after('zone_id');
            $table->index(['zone_id', 'jour_type', 'heure']);
        });
    }

    public function down(): void
    {
        Schema::table('densites', function (Blueprint $table) {
            $table->dropIndex(['zone_id', 'jour_type', 'heure']);
            $table->dropColumn('jour_type');
        });
    }
};
