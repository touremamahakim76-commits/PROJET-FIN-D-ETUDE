<?php

namespace App\Services;

use App\Models\Densite;
use App\Models\Zone;
use Illuminate\Support\Facades\Log;

class MlPredictionService
{
    private const DAY_TYPES = ['JOHV', 'JOVS', 'SAHV', 'SAVS', 'DIJFP'];

    public function predictZone(Zone $zone, int $hour, ?string $dayType = null): array
    {
        $dayType = $this->normalizeDayType($dayType);
        $predictions = $this->predictZones(collect([$zone]), $hour, $dayType);

        return $predictions[$zone->id] ?? $this->fallbackPrediction($zone, $hour, $dayType);
    }

    public function predictZones(iterable $zones, int $hour, ?string $dayType = null): array
    {
        $zones = collect($zones)->values();
        $hour = $this->normalizeHour($hour);
        $dayType = $this->normalizeDayType($dayType);

        if ($zones->isEmpty()) {
            return [];
        }

        if ($zones->count() > 25 && ! config('services.ml.enable_batch_predictions', false)) {
            return $this->storedDensityPredictions($zones, $hour, $dayType);
        }

        $payload = [
            'hour' => $hour,
            'day' => $dayType,
            'model_dir' => $this->modelDir(),
            'zones' => $zones->map(fn (Zone $zone) => $this->zoneInput($zone))->all(),
        ];

        $scriptResult = $this->runPythonPredictor($payload);
        $byId = collect($scriptResult['predictions'] ?? [])
            ->mapWithKeys(fn (array $prediction) => [
                (int) ($prediction['id'] ?? 0) => $this->normalizePrediction($prediction, $hour, $dayType),
            ]);

        return $zones
            ->mapWithKeys(fn (Zone $zone) => [
                $zone->id => $byId->get($zone->id) ?? $this->fallbackPrediction($zone, $hour, $dayType),
            ])
            ->all();
    }

    public function level(float $value): string
    {
        if ($value < 4) {
            return 'low';
        }

        if ($value < 9) {
            return 'medium';
        }

        return 'high';
    }

    private function normalizePrediction(array $prediction, int $hour, string $dayType): array
    {
        $value = round(max(0, min(100, (float) ($prediction['prediction'] ?? 0))), 2);
        $level = $prediction['level'] ?? $this->level($value);
        $confidence = max(0, min(1, (float) ($prediction['confidence'] ?? 0.87)));
        $interval = $prediction['interval'] ?? [
            max(0, round($value - 1.5, 2)),
            min(100, round($value + 1.5, 2)),
        ];

        return [
            'zone_id' => (int) ($prediction['id'] ?? $prediction['zone_id'] ?? 0),
            'hour' => $hour,
            'day_type' => $dayType,
            'prediction' => $value,
            'level' => in_array($level, ['low', 'medium', 'high'], true) ? $level : $this->level($value),
            'confidence' => round($confidence, 2),
            'interval' => [
                round((float) ($interval[0] ?? max(0, $value - 1.5)), 2),
                round((float) ($interval[1] ?? min(100, $value + 1.5)), 2),
            ],
            'message' => $prediction['message'] ?? $this->messageFor($value, $hour),
            'source' => $prediction['source'] ?? 'model',
        ];
    }

    private function fallbackPrediction(Zone $zone, int $hour, string $dayType): array
    {
        $stored = Densite::query()
            ->where('zone_id', $zone->id)
            ->where('jour_type', $dayType)
            ->where('heure', 'like', sprintf('%% %02d:%%', $hour))
            ->first();

        if ($stored) {
            return $this->predictionFromValue($zone->id, (float) $stored->densite, $hour, $dayType, 'observed');
        }

        $rushHourBoost = in_array($hour, [7, 8, 9, 17, 18, 19], true) ? 4.2 : 0.8;
        $mainBoost = $zone->principale ? 2.2 : 0.4;
        $lineBoost = max(1, (int) $zone->nb_lignes) * 0.45;
        $stableNoise = (($zone->id * 37) % 25) / 10;
        $value = round(min(100, $rushHourBoost + $mainBoost + $lineBoost + $stableNoise), 2);

        return $this->predictionFromValue($zone->id, $value, $hour, $dayType, 'fallback', 0.55);
    }

    private function storedDensityPredictions($zones, int $hour, string $dayType): array
    {
        $ids = $zones->pluck('id')->all();
        $densities = Densite::query()
            ->whereIn('zone_id', $ids)
            ->where('jour_type', $dayType)
            ->where('heure', 'like', sprintf('%% %02d:%%', $hour))
            ->get()
            ->keyBy('zone_id');

        return $zones
            ->mapWithKeys(function (Zone $zone) use ($densities, $hour, $dayType) {
                $stored = $densities->get($zone->id);

                if ($stored) {
                    return [
                        $zone->id => $this->predictionFromValue(
                            $zone->id,
                            (float) $stored->densite,
                            $hour,
                            $dayType,
                            'observed'
                        ),
                    ];
                }

                return [$zone->id => $this->fallbackPrediction($zone, $hour, $dayType)];
            })
            ->all();
    }

    private function predictionFromValue(
        int $zoneId,
        float $value,
        int $hour,
        string $dayType,
        string $source,
        float $confidence = 0.82
    ): array {
        $value = round(max(0, min(100, $value)), 2);

        return [
            'zone_id' => $zoneId,
            'hour' => $hour,
            'day_type' => $dayType,
            'prediction' => $value,
            'level' => $this->level($value),
            'confidence' => $confidence,
            'interval' => [
                max(0, round($value - 2, 2)),
                min(100, round($value + 2, 2)),
            ],
            'message' => $this->messageFor($value, $hour),
            'source' => $source,
        ];
    }

    private function runPythonPredictor(array $payload): ?array
    {
        $scriptPath = base_path('ml/predict.py');

        if (! is_file($scriptPath)) {
            Log::warning('ML predictor script not found.', ['script' => $scriptPath]);

            return null;
        }

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        try {
            $process = @proc_open(
                [$this->pythonBinary(), $scriptPath],
                $descriptors,
                $pipes,
                base_path(),
                null,
                ['bypass_shell' => true]
            );
        } catch (\Throwable $exception) {
            Log::warning('Unable to start ML predictor process.', [
                'message' => $exception->getMessage(),
            ]);

            return null;
        }

        if (! is_resource($process)) {
            Log::warning('Unable to start ML predictor process.');

            return null;
        }

        fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
        fclose($pipes[0]);

        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);

        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0) {
            Log::warning('ML predictor failed.', [
                'exit_code' => $exitCode,
                'stderr' => trim($stderr),
            ]);

            return null;
        }

        $decoded = json_decode($stdout, true);

        if (! is_array($decoded)) {
            Log::warning('ML predictor returned invalid JSON.', [
                'stdout' => trim($stdout),
                'stderr' => trim($stderr),
            ]);

            return null;
        }

        return $decoded;
    }

    private function zoneInput(Zone $zone): array
    {
        return [
            'id' => $zone->id,
            'nom' => $zone->nom,
            'latitude' => $zone->latitude,
            'longitude' => $zone->longitude,
            'ligne' => $zone->ligne ?? '',
            'mode' => $zone->mode ?? '',
            'exploitant' => $zone->exploitant ?? '',
            'principale' => (int) $zone->principale,
            'nb_lignes' => (int) ($zone->nb_lignes ?: 1),
        ];
    }

    private function normalizeHour(int $hour): int
    {
        return max(0, min(23, $hour));
    }

    private function defaultDayCategory(): string
    {
        return now()->isWeekend() ? 'SAHV' : 'JOHV';
    }

    private function normalizeDayType(?string $dayType): string
    {
        $dayType = strtoupper((string) ($dayType ?: $this->defaultDayCategory()));

        return in_array($dayType, self::DAY_TYPES, true) ? $dayType : $this->defaultDayCategory();
    }

    private function messageFor(float $value, int $hour): string
    {
        $formattedHour = str_pad((string) $hour, 2, '0', STR_PAD_LEFT).'h';

        if ($value >= 9) {
            return "A {$formattedHour}, cette zone devrait etre tres frequentee.";
        }

        if ($value >= 4) {
            return "A {$formattedHour}, une affluence moderee est attendue.";
        }

        return "A {$formattedHour}, la zone devrait rester calme.";
    }

    private function pythonBinary(): string
    {
        return (string) config('services.ml.python_bin', 'python');
    }

    private function modelDir(): string
    {
        $modelDir = (string) config('services.ml.model_dir', '../ml');

        if (! preg_match('/^([A-Za-z]:[\/\\\\]|\/|\\\\)/', $modelDir)) {
            $modelDir = base_path($modelDir);
        }

        return realpath($modelDir) ?: $modelDir;
    }
}
