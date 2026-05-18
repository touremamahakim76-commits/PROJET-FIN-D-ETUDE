<?php

namespace App\Http\Controllers;

use App\Models\Densite;
use Illuminate\Http\Request;

class DensiteController extends Controller
{
    public function index()
    {
        return Densite::with('zone')->get();
    }

    public function store(Request $request)
    {
        return Densite::create($request->all());
    }
}