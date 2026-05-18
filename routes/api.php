<?php

use App\Http\Controllers\ApiExterneController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DensiteController;
use App\Http\Controllers\TrajetController;
use App\Http\Controllers\ZoneController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/zones', [ZoneController::class, 'index']);
Route::get('/zones/{id}', [ZoneController::class, 'show'])->whereNumber('id');
Route::get('/zones/{id}/predict', [ZoneController::class, 'predict'])->whereNumber('id');
Route::get('/densites', [DensiteController::class, 'index']);
Route::get('/traffic', [ApiExterneController::class, 'traffic']);
Route::post('/routes/calculate', [TrajetController::class, 'calculate']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::post('/zones', [ZoneController::class, 'store']);
    Route::put('/zones/{id}', [ZoneController::class, 'update'])->whereNumber('id');
    Route::delete('/zones/{id}', [ZoneController::class, 'destroy'])->whereNumber('id');
    Route::post('/densites', [DensiteController::class, 'store']);

    Route::get('/trajets', [TrajetController::class, 'index']);
    Route::post('/trajets', [TrajetController::class, 'store']);
    Route::get('/routes/saved', [TrajetController::class, 'index']);
    Route::post('/routes/saved', [TrajetController::class, 'store']);
    Route::patch('/routes/saved/{id}', [TrajetController::class, 'update'])->whereNumber('id');
    Route::delete('/routes/saved/{id}', [TrajetController::class, 'destroy'])->whereNumber('id');
});
