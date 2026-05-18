<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('densites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->constrained('zones')->onDelete('cascade');
            $table->dateTime('heure');
            $table->float('densite');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('densites');
    }
};