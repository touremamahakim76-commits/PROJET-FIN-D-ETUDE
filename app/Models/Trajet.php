<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Trajet extends Model
{
    protected $fillable = [
        'user_id',
        'depart',
        'destination',
        'trajet_data',
    ];

    protected $casts = [
        'trajet_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
