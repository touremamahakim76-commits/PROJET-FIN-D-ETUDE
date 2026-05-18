<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Zone extends Model
{

    protected $fillable = [
        'nom',
        'latitude',
        'longitude',
        'ligne',
        'mode',
        'exploitant',
        'principale',
        'nb_lignes',
        'type',
        'description',
        'radius',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'principale' => 'boolean',
        'nb_lignes' => 'integer',
        'radius' => 'integer',
    ];

    public function densites()
    {
        return $this->hasMany(Densite::class);
    }
}
