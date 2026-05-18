<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;

class ApiExterneController extends Controller
{
    public function traffic()
    {
        $response = Http::get(
            'https://opendata.paris.fr/api/records/1.0/search/?dataset=comptage-velo-donnees-compteurs'
        );

        return response()->json(
            $response->json()
        );
    }
}