<?php

namespace App\Http\Controllers;

use App\Models\Zone;
use App\Services\MlPredictionService;
use Illuminate\Http\Request;

class ZoneController extends Controller
{
    public function index(Request $request, MlPredictionService $ml)
    {
        $hour = $this->hourFromRequest($request);
        $dayType = $this->dayTypeFromRequest($request);
        $zones = Zone::query()->orderBy('id')->get();
        $predictions = $ml->predictZones($zones, $hour, $dayType);

        return $zones->map(fn (Zone $zone) => $this->formatZone(
            $zone,
            $predictions[$zone->id] ?? $ml->predictZone($zone, $hour, $dayType)
        ));
    }

    public function show($id, MlPredictionService $ml)
    {
        $zone = Zone::findOrFail($id);

        return $this->formatZone($zone, $ml->predictZone($zone, now()->hour));
    }

    public function predict(Request $request, $id, MlPredictionService $ml)
    {
        $zone = Zone::findOrFail($id);
        $prediction = $ml->predictZone(
            $zone,
            $this->hourFromRequest($request),
            $this->dayTypeFromRequest($request)
        );

        return response()->json($prediction);
    }

    public function store(Request $request)
    {
        $data = $this->validateZone($request);

        return response()->json(Zone::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $zone = Zone::findOrFail($id);
        $zone->update($this->validateZone($request, partial: true));

        return $zone;
    }

    public function destroy($id)
    {
        Zone::destroy($id);

        return response()->json([
            'message' => 'Zone deleted',
        ]);
    }

    private function formatZone(Zone $zone, array $prediction): array
    {
        return [
            'id' => $zone->id,
            'nom' => $zone->nom,
            'type' => $zone->type ?: 'metro',
            'latitude' => $zone->latitude,
            'longitude' => $zone->longitude,
            'radius' => $zone->radius ?: 450,
            'description' => $zone->description ?: $this->descriptionFor($zone),
            'ligne' => $zone->ligne,
            'mode' => $zone->mode,
            'exploitant' => $zone->exploitant,
            'principale' => (bool) $zone->principale,
            'nb_lignes' => (int) $zone->nb_lignes,
            'densite' => [
                'value' => $prediction['prediction'],
                'level' => $prediction['level'],
                'source' => $prediction['source'],
                'day_type' => $prediction['day_type'] ?? null,
            ],
        ];
    }

    private function descriptionFor(Zone $zone): string
    {
        $mode = $zone->mode ?: 'transport';
        $ligne = $zone->ligne ? " - {$zone->ligne}" : '';

        return "{$mode}{$ligne}";
    }

    private function hourFromRequest(Request $request): int
    {
        return max(0, min(23, (int) $request->query('hour', now()->hour)));
    }

    private function dayTypeFromRequest(Request $request): string
    {
        $dayType = strtoupper((string) $request->query('day_type', 'JOHV'));
        $allowed = ['JOHV', 'JOVS', 'SAHV', 'SAVS', 'DIJFP'];

        return in_array($dayType, $allowed, true) ? $dayType : 'JOHV';
    }

    private function validateZone(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'nom' => [$required, 'string', 'max:255'],
            'latitude' => [$required, 'numeric'],
            'longitude' => [$required, 'numeric'],
            'ligne' => ['nullable', 'string', 'max:255'],
            'mode' => ['nullable', 'string', 'max:255'],
            'exploitant' => ['nullable', 'string', 'max:255'],
            'principale' => ['nullable', 'boolean'],
            'nb_lignes' => ['nullable', 'integer', 'min:1'],
            'type' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            'radius' => ['nullable', 'integer', 'min:100', 'max:5000'],
        ]);
    }
}
