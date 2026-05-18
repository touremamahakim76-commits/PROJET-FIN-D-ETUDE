<?php

namespace App\Http\Controllers;

use App\Models\Trajet;
use App\Models\Densite;
use App\Models\Zone;
use App\Services\MlPredictionService;
use App\Services\OfficialRoutePlannerService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use SplPriorityQueue;

class TrajetController extends Controller
{
    public function calculate(Request $request, MlPredictionService $ml, OfficialRoutePlannerService $officialRoutePlanner)
    {
        $data = $request->validate([
            'depart_id' => ['required', 'integer', 'exists:zones,id'],
            'arrivee_id' => ['required', 'integer', 'exists:zones,id', 'different:depart_id'],
            'hour' => ['nullable', 'integer', 'min:0', 'max:23'],
            'time_mode' => ['nullable', 'in:depart,arrivee'],
            'day_type' => ['nullable', 'in:JOHV,JOVS,SAHV,SAVS,DIJFP'],
        ]);

        $hour = (int) ($data['hour'] ?? now()->hour);
        $dayType = $data['day_type'] ?? 'JOHV';
        $timeMode = $data['time_mode'] ?? 'depart';
        $zones = Zone::query()->orderBy('id')->get();
        $zonesById = $zones->keyBy('id');
        $predictions = $ml->predictZones($zones, $hour, $dayType);
        $departure = $zonesById->get((int) $data['depart_id']);
        $arrival = $zonesById->get((int) $data['arrivee_id']);

        $officialRoutes = $officialRoutePlanner->calculate($departure, $arrival, $zones, $predictions, $hour, $timeMode);

        if ($officialRoutes) {
            return response()->json([
                ...$officialRoutes,
                'time_recommendation' => $this->buildTimeRecommendation($officialRoutes, $zonesById, $ml, $hour, $dayType, $timeMode),
                'hour' => $hour,
                'day_type' => $dayType,
                'time_mode' => $timeMode,
                'method' => 'official_idfm_navitia',
            ]);
        }

        $graph = $this->loadTransitGraph($zones);

        $fastPath = $this->findPath($graph, (int) $data['depart_id'], (int) $data['arrivee_id'], $predictions, 'fast');
        $balancedPath = $this->findPath($graph, (int) $data['depart_id'], (int) $data['arrivee_id'], $predictions, 'balanced', [$fastPath], 2.0);

        if ($this->pathSignature($fastPath) === $this->pathSignature($balancedPath)) {
            $balancedPath = $this->findPath($graph, (int) $data['depart_id'], (int) $data['arrivee_id'], $predictions, 'balanced', [$fastPath], 8.0);
        }

        $calmPath = $this->findQuietestPath($graph, (int) $data['depart_id'], (int) $data['arrivee_id'], $predictions);

        if (
            $this->pathSignature($calmPath) === $this->pathSignature($fastPath)
            || $this->pathSignature($calmPath) === $this->pathSignature($balancedPath)
        ) {
            $calmPath = $this->findQuietestPath($graph, (int) $data['depart_id'], (int) $data['arrivee_id'], $predictions, [$fastPath, $balancedPath], 1.5);
        }

        $fastRoute = $this->formatRoute('normale', $fastPath, $zonesById, $graph, $predictions, $hour, $timeMode);
        $balancedRoute = $this->formatRoute('equilibree', $balancedPath, $zonesById, $graph, $predictions, $hour, $timeMode);
        $calmRoute = $this->quietestFormattedRoute([
            $balancedRoute,
            $this->formatRoute('tres_calme', $calmPath, $zonesById, $graph, $predictions, $hour, $timeMode),
        ], $fastRoute);

        return response()->json([
            'fast' => $fastRoute,
            'balanced' => $balancedRoute,
            'calm' => $calmRoute ? [...$calmRoute, 'type' => 'tres_calme'] : null,
            'calm_unavailable_reason' => $calmRoute ? null : "Aucune alternative plus calme fiable n'a ete trouvee pour ce trajet.",
            'time_recommendation' => $this->buildTimeRecommendation([
                'fast' => $fastRoute,
                'balanced' => $balancedRoute,
                'calm' => $calmRoute,
            ], $zonesById, $ml, $hour, $dayType, $timeMode),
            'hour' => $hour,
            'day_type' => $dayType,
            'time_mode' => $timeMode,
            'method' => 'estimated_transit_graph',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'depart' => ['required', 'string', 'max:255'],
            'arrivee' => ['required', 'string', 'max:255'],
            'distance_km' => ['required', 'numeric'],
            'duree_min' => ['required', 'integer'],
            'densite_max' => ['required', 'in:low,medium,high'],
            'favori' => ['nullable', 'boolean'],
            'route_type' => ['nullable', 'string', 'max:50'],
            'route_label' => ['nullable', 'string', 'max:255'],
            'hour' => ['nullable', 'integer', 'min:0', 'max:23'],
            'day_type' => ['nullable', 'string', 'max:20'],
            'day_type_label' => ['nullable', 'string', 'max:255'],
            'time_mode' => ['nullable', 'in:depart,arrivee'],
            'departure_time' => ['nullable', 'string', 'max:20'],
            'arrival_time' => ['nullable', 'string', 'max:20'],
            'intensite_moyenne' => ['nullable', 'numeric'],
            'intensite_max' => ['nullable', 'numeric'],
            'stations' => ['nullable', 'array'],
            'station_details' => ['nullable', 'array'],
            'segments' => ['nullable', 'array'],
            'coordinates' => ['nullable', 'array'],
            'method' => ['nullable', 'string', 'max:100'],
        ]);

        $trajet = Trajet::create([
            'user_id' => auth()->id(),
            'depart' => $data['depart'],
            'destination' => $data['arrivee'],
            'trajet_data' => [
                ...$data,
                'favori' => (bool) ($data['favori'] ?? false),
            ],
        ]);

        return response()->json($this->formatSavedRoute($trajet), 201);
    }

    public function index()
    {
        return auth()->user()
            ->trajets()
            ->latest()
            ->get()
            ->map(fn (Trajet $trajet) => $this->formatSavedRoute($trajet));
    }

    public function update(Request $request, $id)
    {
        $trajet = auth()->user()->trajets()->findOrFail($id);
        $data = $trajet->trajet_data ?: [];

        if ($request->input('action') === 'toggle_favori') {
            $data['favori'] = ! (bool) ($data['favori'] ?? false);
        }

        $trajet->update(['trajet_data' => $data]);

        return response()->json($this->formatSavedRoute($trajet->fresh()));
    }

    public function destroy($id)
    {
        $trajet = auth()->user()->trajets()->findOrFail($id);
        $trajet->delete();

        return response()->json(['success' => true]);
    }

    private function buildTransitGraph(Collection $zones): array
    {
        $graph = [];
        $lineBuckets = [];
        $zoneList = $zones->values()->all();

        foreach ($zoneList as $zone) {
            $graph[$zone->id] = [];

            foreach ($this->parseLines($this->lineTextForZone($zone)) as $line) {
                $lineBuckets[$line] ??= [];
                $lineBuckets[$line][] = $zone;
            }
        }

        foreach ($lineBuckets as $line => $lineZones) {
            $maxDistance = $this->maxLineEdgeKm($line);
            $neighborCount = $this->neighborsPerLine($line);

            foreach ($lineZones as $zone) {
                $candidates = [];

                foreach ($lineZones as $other) {
                    if ($other->id === $zone->id) {
                        continue;
                    }

                    $distance = $this->haversine($zone, $other);

                    if ($distance <= $maxDistance) {
                        $candidates[] = [
                            'zone' => $other,
                            'distance' => $distance,
                        ];
                    }
                }

                usort($candidates, fn (array $a, array $b) => $a['distance'] <=> $b['distance']);

                foreach (array_slice($candidates, 0, $neighborCount) as $candidate) {
                    $this->addEdge(
                        $graph,
                        $zone,
                        $candidate['zone'],
                        'line',
                        $candidate['distance'],
                        [$line]
                    );
                }
            }
        }

        $zoneCount = count($zoneList);

        for ($i = 0; $i < $zoneCount; $i++) {
            $candidates = [];
            $zone = $zoneList[$i];

            for ($j = 0; $j < $zoneCount; $j++) {
                if ($i === $j) {
                    continue;
                }

                $other = $zoneList[$j];
                $distance = $this->haversine($zone, $other);

                if ($distance <= 0.55) {
                    $candidates[] = [
                        'zone' => $other,
                        'distance' => $distance,
                    ];
                }

            }

            usort($candidates, fn (array $a, array $b) => $a['distance'] <=> $b['distance']);

            foreach (array_slice($candidates, 0, 5) as $candidate) {
                $this->addEdge(
                    $graph,
                    $zone,
                    $candidate['zone'],
                    'transfer',
                    $candidate['distance'],
                    []
                );
            }
        }

        $this->addCentralTransfers($graph, $zones);

        return $graph;
    }

    private function loadTransitGraph(Collection $zones): array
    {
        $cachePath = storage_path('app/transit_graph_v13.json');

        if (is_file($cachePath)) {
            $graph = json_decode(file_get_contents($cachePath), true);

            if (is_array($graph)) {
                return $graph;
            }
        }

        $graph = $this->buildTransitGraph($zones);

        if (! is_dir(dirname($cachePath))) {
            mkdir(dirname($cachePath), 0775, true);
        }

        file_put_contents($cachePath, json_encode($graph, JSON_UNESCAPED_UNICODE));

        return $graph;
    }

    private function addEdge(array &$graph, Zone $from, Zone $to, string $kind, float $distance, array $lines): void
    {
        if ($from->id === $to->id) {
            return;
        }

        if (in_array($kind, ['transfer', 'hub_transfer'], true)) {
            $time = max(4, $distance * 12 + 3);
        } else {
            $time = max(1.5, $distance * $this->minutesPerKm($lines) + 0.8);
        }

        $edge = [
            'to' => $to->id,
            'kind' => $kind,
            'distance_km' => round($distance, 3),
            'time_min' => round($time, 2),
            'lines' => $lines,
        ];

        $reverse = [
            ...$edge,
            'to' => $from->id,
        ];

        if (! isset($graph[$from->id][$to->id]) || $edge['time_min'] < $graph[$from->id][$to->id]['time_min']) {
            $graph[$from->id][$to->id] = $edge;
        }

        if (! isset($graph[$to->id][$from->id]) || $reverse['time_min'] < $graph[$to->id][$from->id]['time_min']) {
            $graph[$to->id][$from->id] = $reverse;
        }
    }

    private function findPath(
        array $graph,
        int $startId,
        int $endId,
        array $predictions,
        string $preference,
        array $avoidPaths = [],
        float $avoidPenalty = 0.0
    ): array {
        $avoidEdges = $this->avoidEdgeMap($avoidPaths);
        $distances = [$startId => 0.0];
        $previous = [];
        $visited = [];
        $queue = new SplPriorityQueue();
        $queue->setExtractFlags(SplPriorityQueue::EXTR_DATA);
        $queue->insert($startId, 0);

        while (! $queue->isEmpty()) {
            $currentId = $queue->extract();

            if (isset($visited[$currentId])) {
                continue;
            }

            $visited[$currentId] = true;

            if ($currentId === $endId) {
                break;
            }

            foreach ($graph[$currentId] ?? [] as $nextId => $edge) {
                $candidate = $distances[$currentId] + $this->edgeWeight(
                    $edge,
                    $predictions,
                    (int) $currentId,
                    (int) $nextId,
                    $preference,
                    $avoidEdges,
                    $avoidPenalty
                );

                if ($candidate < ($distances[$nextId] ?? INF)) {
                    $distances[$nextId] = $candidate;
                    $previous[$nextId] = $currentId;
                    $queue->insert((int) $nextId, -$candidate);
                }
            }
        }

        if (! isset($distances[$endId])) {
            return [$startId, $endId];
        }

        $path = [$endId];
        $cursor = $endId;

        while ($cursor !== $startId && isset($previous[$cursor])) {
            $cursor = $previous[$cursor];
            array_unshift($path, $cursor);
        }

        return $path;
    }

    private function findQuietestPath(
        array $graph,
        int $startId,
        int $endId,
        array $predictions,
        array $avoidPaths = [],
        float $avoidPenalty = 0.0
    ): array {
        $thresholds = $this->quietThresholds($predictions, $startId, $endId);

        foreach ($thresholds as $threshold) {
            $path = $this->findPathUnderIntensity($graph, $startId, $endId, $predictions, $threshold, $avoidPaths, $avoidPenalty);

            if (count($path) > 2 || ($path[0] ?? null) !== $startId || ($path[1] ?? null) !== $endId) {
                return $path;
            }
        }

        return $this->findPath($graph, $startId, $endId, $predictions, 'quiet', $avoidPaths, $avoidPenalty);
    }

    private function findPathUnderIntensity(
        array $graph,
        int $startId,
        int $endId,
        array $predictions,
        float $threshold,
        array $avoidPaths,
        float $avoidPenalty
    ): array {
        $avoidEdges = $this->avoidEdgeMap($avoidPaths);
        $distances = [$startId => 0.0];
        $previous = [];
        $visited = [];
        $queue = new SplPriorityQueue();
        $queue->setExtractFlags(SplPriorityQueue::EXTR_DATA);
        $queue->insert($startId, 0);

        while (! $queue->isEmpty()) {
            $currentId = $queue->extract();

            if (isset($visited[$currentId])) {
                continue;
            }

            $visited[$currentId] = true;

            if ($currentId === $endId) {
                break;
            }

            foreach ($graph[$currentId] ?? [] as $nextId => $edge) {
                $nextId = (int) $nextId;
                $density = (float) ($predictions[$nextId]['prediction'] ?? 0);

                if ($nextId !== $endId && $nextId !== $startId && $density > $threshold) {
                    continue;
                }

                $avoidFastPathPenalty = isset($avoidEdges[$this->edgeKey((int) $currentId, $nextId)]) ? $avoidPenalty : 0.0;
                $densityCost = $nextId === $endId ? 0.0 : $this->quietStationCost($density);
                $candidate = $distances[$currentId]
                    + $densityCost
                    + ($this->longHopPenalty((float) ($edge['distance_km'] ?? 0), $edge['lines'] ?? []) * 0.2)
                    + $avoidFastPathPenalty;

                if ($candidate < ($distances[$nextId] ?? INF)) {
                    $distances[$nextId] = $candidate;
                    $previous[$nextId] = $currentId;
                    $queue->insert($nextId, -$candidate);
                }
            }
        }

        if (! isset($distances[$endId])) {
            return [$startId, $endId];
        }

        $path = [$endId];
        $cursor = $endId;

        while ($cursor !== $startId && isset($previous[$cursor])) {
            $cursor = $previous[$cursor];
            array_unshift($path, $cursor);
        }

        return $path;
    }

    private function quietThresholds(array $predictions, int $startId, int $endId): array
    {
        $thresholds = [3.99, 4.99, 5.99, 6.99, 7.99, 8.99, 9.99, 11.99, 14.99, 19.99, 29.99, 100.0];

        return collect($thresholds)
            ->merge(collect($predictions)
                ->reject(fn (array $prediction, int $zoneId) => in_array((int) $zoneId, [$startId, $endId], true))
                ->pluck('prediction')
                ->map(fn ($value) => round((float) $value, 2)))
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function quietStationCost(float $density): float
    {
        if ($density < 4) {
            return max(0.1, $density) * 0.2;
        }

        if ($density < 9) {
            return ($density ** 2) + 40;
        }

        return ($density ** 3) + 400;
    }

    private function edgeWeight(
        array $edge,
        array $predictions,
        int $fromId,
        int $toId,
        string $preference,
        array $avoidEdges,
        float $avoidPenalty
    ): float
    {
        $longHopPenalty = $this->longHopPenalty((float) ($edge['distance_km'] ?? 0), $edge['lines'] ?? []);

        if ($preference === 'fast') {
            return $edge['time_min'] + $longHopPenalty;
        }

        $density = (float) ($predictions[$toId]['prediction'] ?? 0);
        $avoidFastPathPenalty = isset($avoidEdges[$this->edgeKey($fromId, $toId)]) ? $avoidPenalty : 0.0;

        if ($preference === 'quiet') {
            $mediumDensityPenalty = $density >= 4 ? 3.0 : 0.0;
            $highDensityPenalty = $density >= 9 ? 18.0 : 0.0;
            $transferPenalty = in_array($edge['kind'], ['transfer', 'hub_transfer'], true) ? 1.5 : 0.0;

            return max(0.2, $density) + $mediumDensityPenalty + $highDensityPenalty + $transferPenalty + $longHopPenalty + $avoidFastPathPenalty;
        }

        $highDensityPenalty = $density >= 9 ? 6.0 : 0.0;

        return $edge['time_min'] + $longHopPenalty + ($density * 0.55) + $highDensityPenalty + $avoidFastPathPenalty;
    }

    private function formatRoute(
        string $type,
        array $pathIds,
        Collection $zonesById,
        array $graph,
        array $predictions,
        int $anchorHour,
        string $timeMode
    ): array {
        $zones = collect($pathIds)
            ->map(fn (int $id) => $zonesById->get($id))
            ->filter()
            ->values();

        $distance = 0;
        $duration = 0;
        $segments = [];
        $ml = app(MlPredictionService::class);

        for ($i = 0; $i < $zones->count() - 1; $i++) {
            $from = $zones[$i];
            $to = $zones[$i + 1];
            $edge = $graph[$from->id][$to->id] ?? $this->directEdge($from, $to);
            $toPrediction = (float) ($predictions[$to->id]['prediction'] ?? 0);
            $distance += $edge['distance_km'];
            $duration += $edge['time_min'];
            $segments[] = [
                'from' => $from->nom,
                'to' => $to->nom,
                'kind' => $edge['kind'],
                'lines' => $edge['lines'],
                'distance_km' => $edge['distance_km'],
                'duree_min' => (int) round($edge['time_min']),
                'intensite' => round($toPrediction, 2),
                'intensite_level' => $ml->level($toPrediction),
            ];
        }

        $duration = max(1, (int) round($duration));
        $metricZones = $zones->count() > 2
            ? $zones->slice(1, $zones->count() - 2)->values()
            : $zones;
        $predictionValues = $metricZones
            ->map(fn (Zone $zone) => (float) ($predictions[$zone->id]['prediction'] ?? 0))
            ->values();
        $maxPrediction = $predictionValues->max() ?? 0;
        $avgPrediction = $predictionValues->avg() ?? 0;
        $clockTimes = $this->routeClockTimes($anchorHour, $duration, $timeMode);
        $departurePrediction = $zones->isNotEmpty()
            ? (float) ($predictions[$zones->first()->id]['prediction'] ?? 0)
            : 0;
        $arrivalPrediction = $zones->isNotEmpty()
            ? (float) ($predictions[$zones->last()->id]['prediction'] ?? 0)
            : 0;

        return [
            'type' => $type,
            'coordinates' => $zones->map(fn (Zone $zone) => [$zone->latitude, $zone->longitude])->all(),
            'stations' => $zones->map(fn (Zone $zone) => $zone->nom)->all(),
            'station_details' => $zones->map(fn (Zone $zone) => [
                'id' => $zone->id,
                'nom' => $zone->nom,
                'ligne' => $this->lineTextForZone($zone),
                'mode' => $zone->mode,
                'intensite' => round((float) ($predictions[$zone->id]['prediction'] ?? 0), 2),
                'intensite_level' => $ml->level((float) ($predictions[$zone->id]['prediction'] ?? 0)),
            ])->all(),
            'segments' => $segments,
            'stops_count' => max(0, $zones->count() - 2),
            'distance_km' => round($distance, 1),
            'duree_min' => $duration,
            'departure_time' => $clockTimes['departure'],
            'arrival_time' => $clockTimes['arrival'],
            'intensite_moyenne' => round((float) $avgPrediction, 2),
            'intensite_max' => round((float) $maxPrediction, 2),
            'intensite_depart' => round($departurePrediction, 2),
            'intensite_arrivee' => round($arrivalPrediction, 2),
            'intensite_basis' => $zones->count() > 2 ? 'intermediate_stations' : 'all_stations',
            'intensite_label' => $ml->level((float) $avgPrediction),
            'densite_max' => $ml->level((float) $maxPrediction),
        ];
    }

    private function directEdge(Zone $from, Zone $to): array
    {
        $distance = $this->haversine($from, $to);

        return [
            'kind' => 'direct_fallback',
            'distance_km' => round($distance, 3),
            'time_min' => round(max(1.5, $distance * 2.2), 2),
            'lines' => [],
        ];
    }

    private function quietestFormattedRoute(array $routes, array $baseline): ?array
    {
        $routes = array_values(array_filter(
            $routes,
            fn (array $route) => $this->isStrictlyCalmerRoute($route, $baseline)
        ));

        if (empty($routes)) {
            return null;
        }

        usort($routes, fn (array $a, array $b) => $this->routeCalmScore($a) <=> $this->routeCalmScore($b));

        return $routes[0];
    }

    private function buildTimeRecommendation(
        array $routes,
        Collection $zonesById,
        MlPredictionService $ml,
        int $currentHour,
        string $dayType,
        string $timeMode
    ): ?array {
        $basisKey = ! empty($routes['calm'])
            ? 'calm'
            : (! empty($routes['balanced']) ? 'balanced' : 'fast');
        $basisRoute = $routes[$basisKey] ?? null;

        if (! $basisRoute) {
            return null;
        }

        $calmUnavailable = empty($routes['calm']);
        $currentAverage = (float) ($basisRoute['intensite_moyenne'] ?? 0);
        $currentPeak = (float) ($basisRoute['intensite_max'] ?? 0);

        if (! $calmUnavailable && $currentAverage < 9 && $currentPeak < 9) {
            return null;
        }

        $routeZones = $this->routeZonesForRecommendation($basisRoute, $zonesById);

        if ($routeZones->isEmpty()) {
            return null;
        }

        $hours = $this->nearbyRecommendationHours($currentHour);
        $hourly = $hours->mapWithKeys(fn (int $hour) => [
            $hour => $this->routeIntensityAtHour($routeZones, $ml, $hour, $dayType),
        ]);
        $current = $hourly->get($currentHour)
            ?? $this->routeIntensityAtHour($routeZones, $ml, $currentHour, $dayType);
        $best = $hourly
            ->sortBy(fn (array $metric) => ($metric['average'] * 100) + ($metric['max'] * 10))
            ->first();

        if (! $best) {
            return null;
        }

        $averageGain = round($current['average'] - $best['average'], 2);
        $peakGain = round($current['max'] - $best['max'], 2);
        $meaningfulGain = $best['hour'] !== $currentHour && ($averageGain >= 0.5 || $peakGain >= 1.0);

        if (! $calmUnavailable && ! $meaningfulGain) {
            return null;
        }

        $formattedRecommendedHour = sprintf('%02dh00', $best['hour']);
        $formattedCurrentHour = sprintf('%02dh00', $currentHour);
        $modeVerb = $timeMode === 'arrivee' ? 'arriver' : 'partir';
        $message = $best['hour'] === $currentHour
            ? "Le creneau le moins charge estime est deja {$formattedCurrentHour}."
            : "Pour croiser moins de monde sans trop changer votre programme, il vaut mieux {$modeVerb} vers {$formattedRecommendedHour}.";

        return [
            'available' => true,
            'basis_route' => $basisKey,
            'current_hour' => $currentHour,
            'recommended_hour' => $best['hour'],
            'current_intensite_moyenne' => round($current['average'], 2),
            'recommended_intensite_moyenne' => round($best['average'], 2),
            'current_intensite_max' => round($current['max'], 2),
            'recommended_intensite_max' => round($best['max'], 2),
            'gain_moyen' => $averageGain,
            'gain_pic' => $peakGain,
            'message' => $message,
            'explanation' => $calmUnavailable
                ? "A {$formattedCurrentHour}, aucun itineraire vraiment plus calme n'a ete trouve. Le site compare donc les heures proches de votre choix."
                : "A {$formattedCurrentHour}, meme le meilleur trajet reste charge. Le site cherche une heure proche avec moins d'affluence sur les stations empruntees.",
        ];
    }

    private function nearbyRecommendationHours(int $currentHour): Collection
    {
        $start = max(0, $currentHour - 2);

        return collect(range($start, $currentHour))
            ->push($currentHour)
            ->unique()
            ->sort()
            ->values();
    }

    private function routeZonesForRecommendation(array $route, Collection $zonesById): Collection
    {
        $ids = collect($route['station_details'] ?? [])
            ->pluck('id')
            ->filter(fn ($id) => $id !== null)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        return $ids
            ->map(fn (int $id) => $zonesById->get($id))
            ->filter()
            ->values();
    }

    private function routeIntensityAtHour(Collection $routeZones, MlPredictionService $ml, int $hour, string $dayType): array
    {
        $zoneIds = $routeZones->pluck('id')->all();
        $densities = Densite::query()
            ->whereIn('zone_id', $zoneIds)
            ->where('jour_type', $dayType)
            ->where('heure', 'like', sprintf('%% %02d:%%', $hour))
            ->get()
            ->keyBy('zone_id');
        $values = $routeZones
            ->map(fn (Zone $zone) => (float) ($densities->get($zone->id)?->densite ?? $this->fallbackZoneIntensity($zone, $hour)))
            ->values();

        return [
            'hour' => $hour,
            'average' => $values->isNotEmpty() ? (float) $values->avg() : 0.0,
            'max' => $values->isNotEmpty() ? (float) $values->max() : 0.0,
        ];
    }

    private function fallbackZoneIntensity(Zone $zone, int $hour): float
    {
        $rushHourBoost = in_array($hour, [7, 8, 9, 17, 18, 19], true) ? 4.2 : 0.8;
        $mainBoost = $zone->principale ? 2.2 : 0.4;
        $lineBoost = max(1, (int) $zone->nb_lignes) * 0.45;
        $stableNoise = (($zone->id * 37) % 25) / 10;

        return round(min(100, $rushHourBoost + $mainBoost + $lineBoost + $stableNoise), 2);
    }

    private function isStrictlyCalmerRoute(array $candidate, array $baseline): bool
    {
        if ($this->routeStationSignature($candidate) === $this->routeStationSignature($baseline)) {
            return false;
        }

        $candidateAverage = (float) ($candidate['intensite_moyenne'] ?? 100);
        $baselineAverage = (float) ($baseline['intensite_moyenne'] ?? 100);
        $candidatePeak = (float) ($candidate['intensite_max'] ?? 100);
        $baselinePeak = (float) ($baseline['intensite_max'] ?? 100);

        return $candidateAverage < $baselineAverage - 0.05
            || ($candidateAverage <= $baselineAverage + 0.05 && $candidatePeak < $baselinePeak - 0.05);
    }

    private function routeStationSignature(array $route): string
    {
        return implode('>', $route['stations'] ?? []);
    }

    private function routeCalmScore(array $route): float
    {
        return ((float) ($route['intensite_moyenne'] ?? 100) * 100000)
            + ((float) ($route['intensite_max'] ?? 100) * 1000)
            + ((int) ($route['stops_count'] ?? 0) * 0.01);
    }

    private function addCentralTransfers(array &$graph, Collection $zones): void
    {
        $pairs = [
            [$this->findZoneByName($zones, ['LES HALLES']), $this->findZoneByName($zones, ['TELET'])],
            [$this->findZoneByName($zones, ['GARE DU NORD']), $this->findZoneByName($zones, ["GARE DE L'EST"])],
            [$this->findZoneByName($zones, ['AUBER']), $this->findZoneByName($zones, ['OP', 'RA'])],
        ];

        foreach ($pairs as [$from, $to]) {
            if (! $from || ! $to) {
                continue;
            }

            $this->addEdge(
                $graph,
                $from,
                $to,
                'hub_transfer',
                $this->haversine($from, $to),
                ['CORRESPONDANCE']
            );
        }
    }

    private function findZoneByName(Collection $zones, array $needles): ?Zone
    {
        return $zones->first(function (Zone $zone) use ($needles) {
            $name = strtoupper($zone->nom);

            foreach ($needles as $needle) {
                if (! str_contains($name, strtoupper($needle))) {
                    return false;
                }
            }

            return true;
        });
    }

    private function lineTextForZone(Zone $zone): string
    {
        if (strtoupper($zone->nom) === 'LES HALLES') {
            return 'METRO 4 / RER A / RER B / RER D';
        }

        return (string) $zone->ligne;
    }

    private function avoidEdgeMap(array $paths): array
    {
        $edges = [];

        if (isset($paths[0]) && is_numeric($paths[0])) {
            $paths = [$paths];
        }

        foreach ($paths as $path) {
            if (! is_array($path)) {
                continue;
            }

            for ($i = 0; $i < count($path) - 1; $i++) {
                $fromId = (int) $path[$i];
                $toId = (int) $path[$i + 1];
                $edges[$this->edgeKey($fromId, $toId)] = true;
                $edges[$this->edgeKey($toId, $fromId)] = true;
            }
        }

        return $edges;
    }

    private function edgeKey(int $fromId, int $toId): string
    {
        return "{$fromId}:{$toId}";
    }

    private function pathSignature(array $path): string
    {
        return implode('>', $path);
    }

    private function parseLines(?string $lineText): array
    {
        return collect(preg_split('/\s*\/\s*/', strtoupper((string) $lineText)))
            ->map(fn (string $line) => trim($line))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function maxLineEdgeKm(string $line): float
    {
        if (str_contains($line, 'METRO')) {
            return 2.2;
        }

        if (str_contains($line, 'TRAM')) {
            return 3.2;
        }

        if (str_contains($line, 'RER')) {
            return 16.0;
        }

        if (str_contains($line, 'TRAIN')) {
            return 16.0;
        }

        return 4.0;
    }

    private function neighborsPerLine(string $line): int
    {
        if (str_contains($line, 'METRO')) {
            return 3;
        }

        if (str_contains($line, 'TRAM')) {
            return 2;
        }

        return 3;
    }

    private function minutesPerKm(array $lines): float
    {
        $lineText = implode(' ', $lines);

        if (str_contains($lineText, 'RER')) {
            return 1.25;
        }

        if (str_contains($lineText, 'TRAIN')) {
            return 1.35;
        }

        if (str_contains($lineText, 'TRAM')) {
            return 2.3;
        }

        return 2.0;
    }

    private function longHopPenalty(float $distance, array $lines): float
    {
        $lineText = implode(' ', $lines);

        if (str_contains($lineText, 'METRO')) {
            return max(0, $distance - 0.85) * 14.0;
        }

        if (str_contains($lineText, 'TRAM')) {
            return max(0, $distance - 1.6) * 3.0;
        }

        return 0.0;
    }

    private function routeClockTimes(int $anchorHour, int $durationMinutes, string $timeMode): array
    {
        $anchor = $anchorHour * 60;

        if ($timeMode === 'arrivee') {
            $arrival = $anchor;
            $departure = ($arrival - $durationMinutes + 1440) % 1440;
        } else {
            $departure = $anchor;
            $arrival = ($departure + $durationMinutes) % 1440;
        }

        return [
            'departure' => $this->formatClock($departure),
            'arrival' => $this->formatClock($arrival),
        ];
    }

    private function formatClock(int $minutes): string
    {
        $minutes = ($minutes + 1440) % 1440;
        $hour = intdiv($minutes, 60);
        $minute = $minutes % 60;

        return sprintf('%02dh%02d', $hour, $minute);
    }

    private function haversine(Zone $from, Zone $to): float
    {
        $earthRadiusKm = 6371;
        $latFrom = deg2rad($from->latitude);
        $latTo = deg2rad($to->latitude);
        $latDelta = deg2rad($to->latitude - $from->latitude);
        $lonDelta = deg2rad($to->longitude - $from->longitude);

        $a = sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lonDelta / 2) ** 2;

        return 2 * $earthRadiusKm * asin(sqrt($a));
    }

    private function formatSavedRoute(Trajet $trajet): array
    {
        $data = $trajet->trajet_data ?: [];

        return [
            'id' => $trajet->id,
            'nom' => $data['nom'] ?? "{$trajet->depart} -> {$trajet->destination}",
            'depart' => $data['depart'] ?? $trajet->depart,
            'arrivee' => $data['arrivee'] ?? $trajet->destination,
            'distance_km' => $data['distance_km'] ?? 0,
            'duree_min' => $data['duree_min'] ?? 0,
            'densite_max' => $data['densite_max'] ?? 'medium',
            'favori' => (bool) ($data['favori'] ?? false),
            'route_type' => $data['route_type'] ?? null,
            'route_label' => $data['route_label'] ?? null,
            'hour' => $data['hour'] ?? null,
            'day_type' => $data['day_type'] ?? null,
            'day_type_label' => $data['day_type_label'] ?? null,
            'time_mode' => $data['time_mode'] ?? null,
            'departure_time' => $data['departure_time'] ?? null,
            'arrival_time' => $data['arrival_time'] ?? null,
            'intensite_moyenne' => $data['intensite_moyenne'] ?? null,
            'intensite_max' => $data['intensite_max'] ?? null,
            'stations' => $data['stations'] ?? [],
            'station_details' => $data['station_details'] ?? [],
            'segments' => $data['segments'] ?? [],
            'coordinates' => $data['coordinates'] ?? [],
            'method' => $data['method'] ?? null,
            'cree_le' => $trajet->created_at?->toISOString(),
        ];
    }
}
