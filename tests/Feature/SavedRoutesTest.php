<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SavedRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_save_a_route_with_details(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/routes/saved', [
            'nom' => 'Plus calme : OLYMPIADES -> BIR-HAKEIM',
            'depart' => 'OLYMPIADES',
            'arrivee' => 'BIR-HAKEIM',
            'distance_km' => 13.9,
            'duree_min' => 42,
            'densite_max' => 'low',
            'favori' => false,
            'route_type' => 'calm',
            'route_label' => 'Plus calme',
            'hour' => 10,
            'day_type' => 'JOHV',
            'day_type_label' => 'Jour ouvre hors vacances',
            'time_mode' => 'depart',
            'departure_time' => '10h01',
            'arrival_time' => '10h43',
            'intensite_moyenne' => 2.85,
            'intensite_max' => 4.3,
            'stations' => ['OLYMPIADES', 'BIR-HAKEIM'],
            'station_details' => [
                ['nom' => 'OLYMPIADES', 'intensite' => 3.1],
                ['nom' => 'BIR-HAKEIM', 'intensite' => 2.6],
            ],
            'segments' => [],
            'coordinates' => [[48.827, 2.367], [48.854, 2.289]],
            'method' => 'official_idfm_navitia',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('route_type', 'calm')
            ->assertJsonPath('route_label', 'Plus calme')
            ->assertJsonPath('intensite_moyenne', 2.85)
            ->assertJsonPath('stations.0', 'OLYMPIADES');

        $this->assertDatabaseHas('trajets', [
            'depart' => 'OLYMPIADES',
            'destination' => 'BIR-HAKEIM',
        ]);
    }
}
