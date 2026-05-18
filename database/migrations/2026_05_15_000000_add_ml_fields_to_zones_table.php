<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->string('ligne')->nullable()->after('longitude');
            $table->string('mode')->nullable()->after('ligne');
            $table->string('exploitant')->nullable()->after('mode');
            $table->boolean('principale')->default(false)->after('exploitant');
            $table->unsignedInteger('nb_lignes')->default(1)->after('principale');
            $table->string('type')->default('metro')->after('nb_lignes');
            $table->string('description')->nullable()->after('type');
            $table->unsignedInteger('radius')->default(450)->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->dropColumn([
                'ligne',
                'mode',
                'exploitant',
                'principale',
                'nb_lignes',
                'type',
                'description',
                'radius',
            ]);
        });
    }
};
