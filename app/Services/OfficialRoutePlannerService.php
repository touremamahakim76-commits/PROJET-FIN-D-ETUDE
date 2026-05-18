<?php

namespace App\Services;

use App\Models\Zone;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OfficialRoutePlannerService
{
    public function calculate(
        Zone $departure,
        Zone $arrival,
        Collection $zones,
        array $predictions,
        int $hour,
        string $timeMode
    ): ?array {
        if (! $this->isEnabled()) {
            return null;
        }

        $journeys = $this->fetchJourneys($departure, $arrival, $hour, $timeMode, 5);

        if ($journeys === null || empty($journeys)) {
            return null;
        }

        $formatted = collect($journeys)
            ->map(fn (array $journey) => $this->formatJourney($journey, $zones, $predictions, $departure, $arrival))
            ->filter()
            ->values();

        if ($formatted->isEmpty()) {
            return null;
        }

        $fast = $formatted->sortBy('duree_min')->first();
        $detourRoutes = $this->calmDetourRoutes($departure, $arrival, $zones, $predictions, $hour, $timeMode);
        $calmCandidates = $formatted->concat($detourRoutes)->values();
        $calm = $this->pickCalmRoute($calmCandidates, $fast);
        $balanced = $this->pickBalancedRoute($calmCandidates, $fast, $calm);

        return [
            'fast' => ['type' => 'normale', ...$fast],
            'balanced' => $balanced ? ['type' => 'equilibree', ...$balanced] : null,
            'calm' => $calm ? ['type' => 'tres_calme', ...$calm] : null,
            'calm_unavailable_reason' => $calm ? null : "Aucune alternative plus calme fiable n'a ete trouvee pour ce trajet.",
        ];
    }

    private function isEnabled(): bool
    {
        return (bool) config('services.idfm_navitia.enabled')
            && filled(config('services.idfm_navitia.api_key'));
    }

    private function fetchJourneys(
        Zone $departure,
        Zone $arrival,
        int $hour,
        string $timeMode,
        int $count = 5,
        ?int $timeoutSeconds = null
    ): ?array
    {
        $baseUrl = rtrim((string) config('services.idfm_navitia.base_url'), '/');
        $datetime = now()
            ->setTime($hour, 0)
            ->format('Ymd\THis');
        $timeoutSeconds ??= (int) config('services.idfm_navitia.timeout', 8);

        try {
            $response = Http::timeout($timeoutSeconds)
                ->acceptJson()
                ->withHeaders([
                    'apiKey' => (string) config('services.idfm_navitia.api_key'),
                ])
                ->get("{$baseUrl}/navitia/journeys", [
                    'from' => "{$departure->longitude};{$departure->latitude}",
                    'to' => "{$arrival->longitude};{$arrival->latitude}",
                    'datetime' => $datetime,
                    'datetime_represents' => $timeMode === 'arrivee' ? 'arrival' : 'departure',
                    'first_section_mode[]' => 'walking',
                    'last_section_mode[]' => 'walking',
                    'count' => $count,
                ]);
        } catch (\Throwable $exception) {
            Log::warning('Official route planner unavailable.', ['message' => $exception->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('Official route planner returned an error.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        return $response->json('journeys');
    }

    private function calmDetourRoutes(
        Zone $departure,
        Zone $arrival,
        Collection $zones,
        array $predictions,
        int $hour,
        string $timeMode
    ): Collection {
        $directDistance = max(0.1, $this->zoneDistance($departure, $arrival));
        $candidateLimit = min(2, max(0, (int) config('services.idfm_navitia.calm_candidate_limit', 8)));

        if ($candidateLimit === 0) {
            return collect();
        }

        $candidates = $zones
            ->reject(fn (Zone $zone) => in_array($zone->id, [$departure->id, $arrival->id], true))
            ->map(function (Zone $zone) use ($predictions, $departure, $arrival, $directDistance) {
                $detourDistance = $this->zoneDistance($departure, $zone) + $this->zoneDistance($zone, $arrival);

                return [
                    'zone' => $zone,
                    'intensity' => (float) ($predictions[$zone->id]['prediction'] ?? 100),
                    'detour_ratio' => $detourDistance / $directDistance,
                    'detour_distance' => $detourDistance,
                ];
            })
            ->map(fn (array $candidate) => [
                ...$candidate,
                'corridor_distance' => $this->distanceFromRouteCorridor($departure, $arrival, $candidate['zone']),
                'progress' => $this->routeProgress($departure, $arrival, $candidate['zone']),
            ])
            ->filter(fn (array $candidate) => $candidate['intensity'] < 9
                && $candidate['detour_ratio'] <= $this->maxCalmDetourRatio($directDistance)
                && $candidate['corridor_distance'] <= $this->maxCalmCorridorDistance($directDistance)
                && $candidate['progress'] >= -0.08
                && $candidate['progress'] <= 1.08)
            ->sortBy([
                ['intensity', 'asc'],
                ['corridor_distance', 'asc'],
                ['detour_ratio', 'asc'],
            ])
            ->take($candidateLimit)
            ->values();

        $routes = collect();

        foreach ($candidates as $candidate) {
            $via = $candidate['zone'];
            $firstLeg = $this->bestLegRoute($departure, $via, $zones, $predictions, $hour, $timeMode);
            $secondLeg = $this->bestLegRoute($via, $arrival, $zones, $predictions, $hour, $timeMode);

            if (! $firstLeg || ! $secondLeg) {
                continue;
            }

            $combined = $this->combineLegRoutes($firstLeg, $secondLeg, $via);

            if (! $combined) {
                continue;
            }

            $routes->push($combined);
        }

        return $routes;
    }

    private function bestLegRoute(
        Zone $departure,
        Zone $arrival,
        Collection $zones,
        array $predictions,
        int $hour,
        string $timeMode
    ): ?array {
        $journeys = $this->fetchJourneys($departure, $arrival, $hour, $timeMode, 2, 4);

        if (empty($journeys)) {
            return null;
        }

        return collect($journeys)
            ->map(fn (array $journey) => $this->formatJourney($journey, $zones, $predictions, $departure, $arrival))
            ->filter()
            ->sortBy(fn (array $route) => $this->calmRouteScore($route))
            ->first();
    }

    private function combineLegRoutes(array $firstLeg, array $secondLeg, Zone $via): ?array
    {
        $coordinates = $this->mergeCoordinates($firstLeg['coordinates'] ?? [], $secondLeg['coordinates'] ?? []);
        $stations = $this->mergeRouteList($firstLeg['stations'] ?? [], $secondLeg['stations'] ?? []);
        $stationDetails = $this->mergeStationDetails($firstLeg['station_details'] ?? [], $secondLeg['station_details'] ?? []);
        $segments = array_merge($firstLeg['segments'] ?? [], $secondLeg['segments'] ?? []);

        if (count($stationDetails) < 3 || empty($segments)) {
            return null;
        }

        if ($this->hasRepeatedStations($stationDetails)) {
            return null;
        }

        $metrics = $this->routeIntensityMetrics($stationDetails);
        $ml = app(MlPredictionService::class);

        return [
            'coordinates' => $coordinates,
            'stations' => $stations,
            'station_details' => $stationDetails,
            'segments' => $segments,
            'stops_count' => max(0, count($stations) - 2),
            'distance_km' => round(((float) ($firstLeg['distance_km'] ?? 0)) + ((float) ($secondLeg['distance_km'] ?? 0)), 1),
            'duree_min' => max(1, (int) (($firstLeg['duree_min'] ?? 0) + ($secondLeg['duree_min'] ?? 0))),
            'departure_time' => $firstLeg['departure_time'] ?? '--h--',
            'arrival_time' => $secondLeg['arrival_time'] ?? '--h--',
            'intensite_moyenne' => round($metrics['average'], 2),
            'intensite_max' => round($metrics['max'], 2),
            'intensite_label' => $ml->level($metrics['average']),
            'densite_max' => $ml->level($metrics['max']),
            'intensite_basis' => count($stationDetails) > 2 ? 'intermediate_stations' : 'all_stations',
            'transport_sections_count' => (int) ($firstLeg['transport_sections_count'] ?? 0) + (int) ($secondLeg['transport_sections_count'] ?? 0),
            'unmatched_stations_count' => $metrics['unmatched_count'],
            'unmatched_stations' => $metrics['unmatched_names'],
            'via_station' => $via->nom,
            'detour' => true,
            'official' => true,
        ];
    }

    private function formatJourney(
        array $journey,
        Collection $zones,
        array $predictions,
        Zone $departure,
        Zone $arrival
    ): ?array {
        $coordinates = [];
        $stations = [];
        $stationDetails = [];
        $segments = [];
        $distance = 0.0;
        $transportSections = 0;

        foreach (($journey['sections'] ?? []) as $section) {
            $sectionCoordinates = $this->sectionCoordinates($section);
            $coordinates = $this->mergeCoordinates($coordinates, $sectionCoordinates);
            $distance += ((float) ($section['length'] ?? 0)) / 1000;

            if (($section['type'] ?? '') === 'public_transport') {
                $transportSections++;
                $lineLabel = $this->sectionLineLabel($section);
                $sectionStops = $this->sectionStops($section, $zones, $lineLabel);

                if (! empty($sectionStops)) {
                    foreach ($sectionStops as $stop) {
                        $this->appendStation($stations, $stationDetails, $stop, $predictions);
                    }

                    $segments = array_merge($segments, $this->segmentsBetweenStops($sectionStops, $section, $lineLabel));
                } else {
                    $endpointStops = [];

                    foreach (['from', 'to'] as $endpoint) {
                        $stop = $this->endpointStop($section[$endpoint] ?? null, $zones, $lineLabel);

                        if ($stop) {
                            $this->appendStation($stations, $stationDetails, $stop, $predictions);
                            $endpointStops[] = $stop;
                        }
                    }

                    $segments = array_merge($segments, $this->segmentsBetweenStops($endpointStops, $section, $lineLabel));
                }
            }
        }

        if ($transportSections === 0 || empty($segments)) {
            return null;
        }

        $this->ensureSelectedEndpoint($stations, $stationDetails, [
            'name' => $departure->nom,
            'zone' => $departure,
        ], $predictions, 'start');
        $this->ensureSelectedEndpoint($stations, $stationDetails, [
            'name' => $arrival->nom,
            'zone' => $arrival,
        ], $predictions, 'end');

        $coordinates = $this->forceEndpointCoordinates($coordinates, $departure, $arrival);

        if ($distance <= 0) {
            $distance = $this->coordinateDistance($coordinates);
        }

        $duration = max(1, (int) round(((int) ($journey['duration'] ?? 0)) / 60));
        $metrics = $this->routeIntensityMetrics($stationDetails);
        $average = $metrics['average'];
        $max = $metrics['max'];
        $ml = app(MlPredictionService::class);
        $unmatchedStationsCount = $metrics['unmatched_count'];
        $unmatchedStationNames = $metrics['unmatched_names'];

        if (! empty($unmatchedStationNames)) {
            Log::info('Official route stations without local intensity.', [
                'stations' => $unmatchedStationNames,
            ]);
        }

        return [
            'coordinates' => $coordinates,
            'stations' => array_values($stations),
            'station_details' => array_values($stationDetails),
            'segments' => $segments,
            'stops_count' => max(0, count($stations) - 2),
            'distance_km' => round($distance, 1),
            'duree_min' => $duration,
            'departure_time' => $this->formatNavitiaTime($journey['departure_date_time'] ?? null),
            'arrival_time' => $this->formatNavitiaTime($journey['arrival_date_time'] ?? null),
            'intensite_moyenne' => round($average, 2),
            'intensite_max' => round($max, 2),
            'intensite_label' => $ml->level($average),
            'densite_max' => $ml->level($max),
            'intensite_basis' => count($stationDetails) > 2 ? 'intermediate_stations' : 'all_stations',
            'transport_sections_count' => $transportSections,
            'unmatched_stations_count' => $unmatchedStationsCount,
            'unmatched_stations' => $unmatchedStationNames,
            'official' => true,
        ];
    }

    private function sectionCoordinates(array $section): array
    {
        return collect($section['geojson']['coordinates'] ?? [])
            ->filter(fn ($coordinate) => is_array($coordinate) && count($coordinate) >= 2)
            ->map(fn (array $coordinate) => [(float) $coordinate[1], (float) $coordinate[0]])
            ->values()
            ->all();
    }

    private function sectionStops(array $section, Collection $zones, string $lineLabel): array
    {
        return collect($section['stop_date_times'] ?? [])
            ->map(function (array $stopDateTime) use ($zones) {
                $stopPoint = $stopDateTime['stop_point'] ?? [];
                $name = $this->stationName($stopPoint['name'] ?? null);

                if (! $name) {
                    return null;
                }

                return [
                    'name' => $name,
                    'zone' => $this->matchZone($name, $zones, $this->stopCoordinate($stopPoint)),
                    'coordinate' => $this->stopCoordinate($stopPoint),
                ];
            })
            ->filter()
            ->map(fn (array $stop) => [...$stop, 'line' => $lineLabel])
            ->values()
            ->all();
    }

    private function endpointStop(?array $endpoint, Collection $zones, string $lineLabel): ?array
    {
        $name = $this->stationName($endpoint['name'] ?? null);

        if (! $name) {
            return null;
        }

        $coordinate = $this->stopCoordinate($endpoint);

        return [
            'name' => $name,
            'zone' => $this->matchZone($name, $zones, $coordinate),
            'coordinate' => $coordinate,
            'line' => $lineLabel,
        ];
    }

    private function appendStation(array &$stations, array &$details, array $stop, array $predictions): void
    {
        $name = $this->stationName($stop['name'] ?? null);

        if (! $name) {
            return;
        }

        $previous = end($stations);

        if ($previous !== false && $this->isSameStationName((string) $previous, $name)) {
            return;
        }

        $zone = $stop['zone'] ?? null;
        $displayName = $zone instanceof Zone ? $zone->nom : $name;
        $prediction = $zone ? (float) ($predictions[$zone->id]['prediction'] ?? 0) : null;
        $level = $prediction !== null ? app(MlPredictionService::class)->level($prediction) : null;
        $stations[] = $displayName;
        $details[] = [
            'id' => $zone?->id,
            'nom' => $displayName,
            'ligne' => $zone?->ligne ?? ($stop['line'] ?? 'Station officielle'),
            'mode' => $zone?->mode ?? 'Navitia',
            'intensite' => $prediction !== null ? round($prediction, 2) : null,
            'intensite_level' => $level,
            'intensite_available' => $prediction !== null,
        ];
    }

    private function ensureSelectedEndpoint(
        array &$stations,
        array &$details,
        array $stop,
        array $predictions,
        string $position
    ): void {
        $name = $this->stationName($stop['name'] ?? null);

        if (! $name) {
            return;
        }

        if (empty($stations)) {
            $this->appendStation($stations, $details, $stop, $predictions);

            return;
        }

        $index = $position === 'start' ? 0 : count($stations) - 1;

        if ($this->isSameStationName((string) $stations[$index], $name)) {
            $zone = $stop['zone'] ?? null;
            $prediction = $zone ? (float) ($predictions[$zone->id]['prediction'] ?? 0) : null;
            $stations[$index] = $zone instanceof Zone ? $zone->nom : $name;
            $details[$index] = [
                'id' => $zone?->id,
                'nom' => $stations[$index],
                'ligne' => $zone?->ligne ?? ($stop['line'] ?? 'Station officielle'),
                'mode' => $zone?->mode ?? 'Navitia',
                'intensite' => $prediction !== null ? round($prediction, 2) : null,
                'intensite_level' => $prediction !== null ? app(MlPredictionService::class)->level($prediction) : null,
                'intensite_available' => $prediction !== null,
            ];

            return;
        }

        if ($position === 'start') {
            $newStations = [];
            $newDetails = [];
            $this->appendStation($newStations, $newDetails, $stop, $predictions);
            $stations = array_merge($newStations, $stations);
            $details = array_merge($newDetails, $details);

            return;
        }

        $this->appendStation($stations, $details, $stop, $predictions);
    }

    private function matchZone(string $name, Collection $zones, ?array $coordinate = null): ?Zone
    {
        if ($this->looksLikeAddress($name)) {
            return null;
        }

        $knownAlias = $this->knownAliasZone($name, $zones);

        if ($knownAlias) {
            return $knownAlias;
        }

        $needles = $this->stationNameVariants($name);

        foreach ($needles as $needle) {
            $match = $zones->first(fn (Zone $zone) => in_array($needle, $this->stationNameVariants($zone->nom), true));

            if ($match) {
                return $match;
            }
        }

        foreach ($needles as $needle) {
            $match = $zones->first(function (Zone $zone) use ($needle) {
                foreach ($this->stationNameVariants($zone->nom) as $candidate) {
                    if ($this->namesContainEachOther($needle, $candidate)) {
                        return true;
                    }
                }

                return false;
            });

            if ($match) {
                return $match;
            }
        }

        $bestTokenMatch = $this->bestNameSimilarityMatch($needles, $zones);

        return $bestTokenMatch ?? $this->nearestZone($coordinate, $zones, 1.25);
    }

    private function pickBestDistinct(Collection $routes, array $alreadyPicked, callable $score): ?array
    {
        $pickedSignatures = collect($alreadyPicked)
            ->filter()
            ->map(fn (array $route) => $this->routeSignature($route))
            ->all();

        return $routes
            ->reject(fn (array $route) => in_array($this->routeSignature($route), $pickedSignatures, true))
            ->sortBy($score)
            ->first();
    }

    private function pickBalancedRoute(Collection $routes, array $fast, ?array $calm): ?array
    {
        $alreadyPicked = [$fast];

        if ($calm && ($calm['duree_min'] ?? 0) <= 120) {
            $alreadyPicked[] = $calm;
        }

        $fastDuration = max(1, (int) ($fast['duree_min'] ?? 1));
        $calmDuration = $calm ? (int) ($calm['duree_min'] ?? 0) : 0;
        $maxUsefulDuration = $calmDuration > 120
            ? min($calmDuration - 1, max(120, (int) round($fastDuration * 2.4)))
            : max(120, (int) round($fastDuration * 2.0));

        $reasonableRoutes = $routes
            ->filter(fn (array $route) => (int) ($route['duree_min'] ?? 9999) <= $maxUsefulDuration);

        $routesWithIntensityGain = ($reasonableRoutes->isNotEmpty() ? $reasonableRoutes : $routes)
            ->filter(fn (array $route) => $this->isStrictlyCalmerThan($route, $fast));

        return $this->pickBestDistinct(
            $routesWithIntensityGain,
            $alreadyPicked,
            fn (array $route) => $this->balancedRouteScore($route, $fastDuration)
        );
    }

    private function balancedRouteScore(array $route, int $fastDuration): float
    {
        $duration = (float) ($route['duree_min'] ?? 9999);
        $durationRatio = $duration / max(1, $fastDuration);

        return ($duration * 1.3)
            + ($durationRatio > 2.4 ? 10000 : 0)
            + ((float) ($route['intensite_moyenne'] ?? 100) * 10)
            + ((float) ($route['intensite_max'] ?? 100) * 4)
            + (($route['unmatched_stations_count'] ?? 0) * 100000)
            + (($route['detour'] ?? false) ? 8 : 0);
    }

    private function pickCalmRoute(Collection $routes, array $fast): ?array
    {
        return $routes
            ->reject(fn (array $route) => $this->routeSignature($route) === $this->routeSignature($fast))
            ->filter(fn (array $route) => $this->isStrictlyCalmerThan($route, $fast))
            ->sortBy(fn (array $route) => $this->calmRouteScore($route))
            ->first();
    }

    private function isStrictlyCalmerThan(array $candidate, array $baseline): bool
    {
        if ($this->routeSignature($candidate) === $this->routeSignature($baseline)) {
            return false;
        }

        $candidateAverage = (float) ($candidate['intensite_moyenne'] ?? 100);
        $baselineAverage = (float) ($baseline['intensite_moyenne'] ?? 100);
        $candidatePeak = (float) ($candidate['intensite_max'] ?? 100);
        $baselinePeak = (float) ($baseline['intensite_max'] ?? 100);

        return $candidateAverage < $baselineAverage - 0.05
            || ($candidateAverage <= $baselineAverage + 0.05 && $candidatePeak < $baselinePeak - 0.05);
    }

    private function calmRouteScore(array $route): float
    {
        return (($route['unmatched_stations_count'] ?? 0) * 100000000)
            + ($route['intensite_moyenne'] * 100000)
            + ($route['intensite_max'] * 1000)
            + (($route['stops_count'] ?? 0) * 0.01);
    }

    private function routeSignature(array $route): string
    {
        return implode('>', $route['stations'] ?? []);
    }

    private function knownAliasZone(string $name, Collection $zones): ?Zone
    {
        $normalized = $this->normalizeName($name);

        if (str_contains($normalized, 'CHATELET') && str_contains($normalized, 'HALLES')) {
            return $zones->first(fn (Zone $zone) => $this->normalizeName($zone->nom) === 'LESHALLES');
        }

        return null;
    }

    private function sectionLineLabel(array $section): string
    {
        $infos = $section['display_informations'] ?? [];
        $mode = $infos['commercial_mode'] ?? $infos['physical_mode'] ?? 'Transport';
        $code = $infos['code'] ?? $infos['label'] ?? '';

        return trim("{$mode} {$code}") ?: 'Transport';
    }

    private function segmentsBetweenStops(array $stops, array $section, string $lineLabel): array
    {
        if (count($stops) < 2) {
            return [];
        }

        $segments = [];
        $steps = count($stops) - 1;
        $distance = ((float) ($section['length'] ?? 0)) / 1000;
        $duration = max(1, (int) round(((int) ($section['duration'] ?? 0)) / 60));
        $distanceByStep = $steps > 0 ? $distance / $steps : $distance;
        $durationByStep = $steps > 0 ? max(1, (int) round($duration / $steps)) : $duration;

        for ($i = 0; $i < $steps; $i++) {
            $from = $this->stopDisplayName($stops[$i]);
            $to = $this->stopDisplayName($stops[$i + 1]);

            if (! $from || ! $to || $this->isSameStationName($from, $to)) {
                continue;
            }

            $segments[] = [
                'from' => $from,
                'to' => $to,
                'kind' => 'official',
                'lines' => [$lineLabel],
                'distance_km' => round($distanceByStep, 3),
                'duree_min' => $durationByStep,
            ];
        }

        return $segments;
    }

    private function routeIntensityMetrics(array $stationDetails): array
    {
        $metricDetails = count($stationDetails) > 2
            ? array_slice($stationDetails, 1, -1)
            : $stationDetails;
        $values = collect($metricDetails)
            ->unique(fn (array $detail) => $this->stationDetailKey($detail))
            ->filter(fn (array $detail) => (bool) ($detail['intensite_available'] ?? true))
            ->map(fn (array $detail) => (float) ($detail['intensite'] ?? 0))
            ->values();
        $unmatchedNames = collect($stationDetails)
            ->filter(fn (array $detail) => ! (bool) ($detail['intensite_available'] ?? true))
            ->pluck('nom')
            ->values()
            ->all();

        return [
            'average' => $values->isNotEmpty() ? (float) $values->avg() : 100.0,
            'max' => $values->isNotEmpty() ? (float) $values->max() : 100.0,
            'unmatched_count' => count($unmatchedNames),
            'unmatched_names' => $unmatchedNames,
        ];
    }

    private function hasRepeatedStations(array $stationDetails): bool
    {
        $seen = [];

        foreach ($stationDetails as $detail) {
            $key = $this->stationDetailKey($detail);

            if ($key === '') {
                continue;
            }

            if (isset($seen[$key])) {
                return true;
            }

            $seen[$key] = true;
        }

        return false;
    }

    private function stationDetailKey(array $detail): string
    {
        if (($detail['id'] ?? null) !== null) {
            return 'id:' . $detail['id'];
        }

        return $this->normalizeName((string) ($detail['nom'] ?? ''));
    }

    private function mergeRouteList(array $first, array $second): array
    {
        foreach ($second as $item) {
            $last = end($first);

            if ($last !== false && $this->isSameStationName((string) $last, (string) $item)) {
                continue;
            }

            $first[] = $item;
        }

        return array_values($first);
    }

    private function mergeStationDetails(array $first, array $second): array
    {
        foreach ($second as $detail) {
            $last = end($first);

            if (
                $last !== false
                && (
                    (($last['id'] ?? null) !== null && ($last['id'] ?? null) === ($detail['id'] ?? null))
                    || $this->isSameStationName((string) ($last['nom'] ?? ''), (string) ($detail['nom'] ?? ''))
                )
            ) {
                continue;
            }

            $first[] = $detail;
        }

        return array_values($first);
    }

    private function stopDisplayName(array $stop): ?string
    {
        $zone = $stop['zone'] ?? null;

        if ($zone instanceof Zone) {
            return $zone->nom;
        }

        return $this->stationName($stop['name'] ?? null);
    }

    private function displayStationName(?string $value, Collection $zones): ?string
    {
        $name = $this->stationName($value);

        if (! $name) {
            return null;
        }

        return $this->matchZone($name, $zones)?->nom ?? $name;
    }

    private function stopCoordinate(?array $source): ?array
    {
        $coord = $source['coord'] ?? null;

        if (! is_array($coord)) {
            return null;
        }

        $lat = $coord['lat'] ?? null;
        $lon = $coord['lon'] ?? null;

        if (! is_numeric($lat) || ! is_numeric($lon)) {
            return null;
        }

        return [(float) $lat, (float) $lon];
    }

    private function nearestZone(?array $coordinate, Collection $zones, float $maxDistanceKm = 0.75): ?Zone
    {
        if (! $coordinate) {
            return null;
        }

        $nearest = null;
        $bestDistance = INF;

        foreach ($zones as $zone) {
            $distance = $this->haversine($coordinate, [(float) $zone->latitude, (float) $zone->longitude]);

            if ($distance < $bestDistance) {
                $nearest = $zone;
                $bestDistance = $distance;
            }
        }

        return $bestDistance <= $maxDistanceKm ? $nearest : null;
    }

    private function maxCalmDetourRatio(float $directDistance): float
    {
        if ($directDistance <= 3.0) {
            return 3.5;
        }

        if ($directDistance <= 8.0) {
            return 3.0;
        }

        if ($directDistance <= 20.0) {
            return 2.5;
        }

        return 2.1;
    }

    private function maxCalmCorridorDistance(float $directDistance): float
    {
        return max(2.0, min(10.0, $directDistance * 0.45));
    }

    private function distanceFromRouteCorridor(Zone $departure, Zone $arrival, Zone $candidate): float
    {
        $point = $this->projectedPoint($departure, $arrival, $candidate);
        $end = $this->projectedPoint($departure, $arrival, $arrival);
        $lengthSquared = ($end['x'] ** 2) + ($end['y'] ** 2);

        if ($lengthSquared <= 0.000001) {
            return $this->zoneDistance($departure, $candidate);
        }

        $progress = max(0.0, min(1.0, (($point['x'] * $end['x']) + ($point['y'] * $end['y'])) / $lengthSquared));
        $closest = [
            'x' => $end['x'] * $progress,
            'y' => $end['y'] * $progress,
        ];

        return sqrt((($point['x'] - $closest['x']) ** 2) + (($point['y'] - $closest['y']) ** 2));
    }

    private function routeProgress(Zone $departure, Zone $arrival, Zone $candidate): float
    {
        $point = $this->projectedPoint($departure, $arrival, $candidate);
        $end = $this->projectedPoint($departure, $arrival, $arrival);
        $lengthSquared = ($end['x'] ** 2) + ($end['y'] ** 2);

        if ($lengthSquared <= 0.000001) {
            return 0.0;
        }

        return (($point['x'] * $end['x']) + ($point['y'] * $end['y'])) / $lengthSquared;
    }

    private function projectedPoint(Zone $origin, Zone $reference, Zone $point): array
    {
        $latScale = 111.32;
        $lonScale = 111.32 * cos(deg2rad(((float) $origin->latitude + (float) $reference->latitude) / 2));

        return [
            'x' => ((float) $point->longitude - (float) $origin->longitude) * $lonScale,
            'y' => ((float) $point->latitude - (float) $origin->latitude) * $latScale,
        ];
    }

    private function mergeCoordinates(array $existing, array $incoming): array
    {
        if (empty($incoming)) {
            return $existing;
        }

        if (! empty($existing) && $existing[count($existing) - 1] === $incoming[0]) {
            array_shift($incoming);
        }

        return array_merge($existing, $incoming);
    }

    private function forceEndpointCoordinates(array $coordinates, Zone $departure, Zone $arrival): array
    {
        $coordinates = collect($coordinates)
            ->filter(fn ($coordinate) => is_array($coordinate)
                && count($coordinate) >= 2
                && is_numeric($coordinate[0])
                && is_numeric($coordinate[1]))
            ->map(fn (array $coordinate) => [(float) $coordinate[0], (float) $coordinate[1]])
            ->values()
            ->all();

        $start = $this->zoneCoordinate($departure);
        $end = $this->zoneCoordinate($arrival);

        if (empty($coordinates)) {
            return [$start, $end];
        }

        if ($this->haversine($start, $coordinates[0]) <= 0.08) {
            $coordinates[0] = $start;
        } else {
            array_unshift($coordinates, $start);
        }

        $lastIndex = count($coordinates) - 1;

        if ($this->haversine($coordinates[$lastIndex], $end) <= 0.08) {
            $coordinates[$lastIndex] = $end;
        } else {
            $coordinates[] = $end;
        }

        return $this->deduplicateConsecutiveCoordinates($coordinates);
    }

    private function zoneCoordinate(Zone $zone): array
    {
        return [(float) $zone->latitude, (float) $zone->longitude];
    }

    private function deduplicateConsecutiveCoordinates(array $coordinates): array
    {
        $deduplicated = [];

        foreach ($coordinates as $coordinate) {
            $last = end($deduplicated);

            if ($last !== false && $this->haversine($last, $coordinate) <= 0.005) {
                $deduplicated[count($deduplicated) - 1] = $coordinate;
                continue;
            }

            $deduplicated[] = $coordinate;
        }

        return $deduplicated;
    }

    private function coordinateDistance(array $coordinates): float
    {
        $distance = 0.0;

        for ($i = 0; $i < count($coordinates) - 1; $i++) {
            $distance += $this->haversine($coordinates[$i], $coordinates[$i + 1]);
        }

        return $distance;
    }

    private function zoneDistance(Zone $from, Zone $to): float
    {
        return $this->haversine(
            [(float) $from->latitude, (float) $from->longitude],
            [(float) $to->latitude, (float) $to->longitude]
        );
    }

    private function haversine(array $from, array $to): float
    {
        $earthRadiusKm = 6371;
        $latFrom = deg2rad((float) $from[0]);
        $latTo = deg2rad((float) $to[0]);
        $latDelta = deg2rad((float) $to[0] - (float) $from[0]);
        $lonDelta = deg2rad((float) $to[1] - (float) $from[1]);
        $a = sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lonDelta / 2) ** 2;

        return 2 * $earthRadiusKm * asin(sqrt($a));
    }

    private function formatNavitiaTime(?string $value): string
    {
        if (! $value) {
            return '--h--';
        }

        try {
            return Carbon::createFromFormat('Ymd\THis', $value)->format('H\hi');
        } catch (\Throwable) {
            return '--h--';
        }
    }

    private function stationName(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : strtoupper($value);
    }

    private function normalizeName(string $value): string
    {
        $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;

        return preg_replace('/[^A-Z0-9]+/', '', strtoupper($value)) ?: '';
    }

    private function stationNameVariants(string $value): array
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
        $text = strtoupper($ascii);
        $variants = [$text];

        $withoutParentheses = preg_replace('/\s*\([^)]*\)\s*/', ' ', $text) ?: $text;
        $variants[] = $withoutParentheses;

        $withoutTransportWords = preg_replace(
            '/\b(GARE|STATION|METRO|RER|TRAIN|TRAM|BUS|POLE|ARRET)\b/',
            ' ',
            $withoutParentheses
        ) ?: $withoutParentheses;
        $variants[] = $withoutTransportWords;

        $withoutLocationWords = preg_replace(
            '/\b(DE|DU|DES|D|LA|LE|LES|A|AU|AUX|PARIS|IDF|ILE|FRANCE)\b/',
            ' ',
            $withoutTransportWords
        ) ?: $withoutTransportWords;
        $variants[] = $withoutLocationWords;

        $variants[] = str_replace([' SAINT ', ' SAINTE ', ' ST ', ' STE '], ' S ', " {$withoutLocationWords} ");

        return collect($variants)
            ->map(fn (string $variant) => $this->normalizeName($variant))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function namesContainEachOther(string $left, string $right): bool
    {
        if ($left === '' || $right === '') {
            return false;
        }

        if (strlen($left) < 4 || strlen($right) < 4) {
            return $left === $right;
        }

        return str_contains($left, $right) || str_contains($right, $left);
    }

    private function bestNameSimilarityMatch(array $needles, Collection $zones): ?Zone
    {
        $bestZone = null;
        $bestScore = 0.0;

        foreach ($zones as $zone) {
            foreach ($needles as $needle) {
                foreach ($this->stationNameVariants($zone->nom) as $candidate) {
                    $score = $this->nameSimilarity($needle, $candidate);

                    if ($score > $bestScore) {
                        $bestZone = $zone;
                        $bestScore = $score;
                    }
                }
            }
        }

        return $bestScore >= 0.82 ? $bestZone : null;
    }

    private function nameSimilarity(string $left, string $right): float
    {
        if ($left === '' || $right === '') {
            return 0.0;
        }

        $maxLength = max(strlen($left), strlen($right));

        if ($maxLength === 0) {
            return 0.0;
        }

        return 1 - (levenshtein($left, $right) / $maxLength);
    }

    private function isSameStationName(string $left, string $right): bool
    {
        foreach ($this->stationNameVariants($left) as $leftVariant) {
            foreach ($this->stationNameVariants($right) as $rightVariant) {
                if ($this->namesContainEachOther($leftVariant, $rightVariant)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function looksLikeAddress(string $name): bool
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: $name;
        $text = strtoupper($ascii);

        return preg_match('/^\s*\d+\s*(RUE|AVENUE|BOULEVARD|PLACE|QUAI|IMPASSE|ALLEE)\b/', $text) === 1;
    }
}
