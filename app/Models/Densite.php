<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Densite extends Model
{
    protected $fillable = [
        'zone_id',
        'jour_type',
        'heure',
        'densite',
    ];

    protected $casts = [
        'densite' => 'float',
    ];

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }
}
