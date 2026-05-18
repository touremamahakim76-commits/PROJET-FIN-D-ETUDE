<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Zone;
use App\Models\Densite;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'yasmine@test.com'],
            [
                'name' => 'Yasmine',
                'password' => Hash::make('monpass123'),
            ]
        );

        $zonesPath = realpath(base_path('../ml/zones_metro.json'));

        if (! $zonesPath || ! is_file($zonesPath)) {
            return;
        }

        $zones = json_decode(file_get_contents($zonesPath), true);

        if (! is_array($zones)) {
            return;
        }

        $rows = collect($zones)->map(function (array $zone) {
            if (($zone['nom'] ?? null) === 'LES HALLES') {
                $zone['ligne'] = 'METRO 4 / RER A / RER B / RER D';
                $zone['mode'] = 'METRO / RER';
                $zone['exploitant'] = 'RATP / SNCF';
                $zone['principale'] = 1;
                $zone['nb_lignes'] = 4;
            }

            return [
                'id' => $zone['id'],
                'nom' => $zone['nom'],
                'latitude' => $zone['latitude'],
                'longitude' => $zone['longitude'],
                'ligne' => $zone['ligne'] ?? null,
                'mode' => $zone['mode'] ?? null,
                'exploitant' => $zone['exploitant'] ?? null,
                'principale' => (bool) ($zone['principale'] ?? false),
                'nb_lignes' => (int) ($zone['nb_lignes'] ?? 1),
                'type' => $zone['type'] ?? 'metro',
                'description' => trim(($zone['mode'] ?? 'Transport').(($zone['ligne'] ?? null) ? ' - '.$zone['ligne'] : '')),
                'radius' => ! empty($zone['principale']) ? 650 : 450,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->all();

        Zone::upsert(
            $rows,
            ['id'],
            [
                'nom',
                'latitude',
                'longitude',
                'ligne',
                'mode',
                'exploitant',
                'principale',
                'nb_lignes',
                'type',
                'description',
                'radius',
                'updated_at',
            ]
        );

        $this->seedHourlyDensities();
    }

    private function seedHourlyDensities(): void
    {
        $csvPath = realpath(base_path('../ml/validations_metro_final.csv'));

        if (! $csvPath || ! is_file($csvPath)) {
            return;
        }

        $zoneIdsByName = Zone::query()->pluck('id', 'nom');
        $handle = fopen($csvPath, 'r');

        if (! $handle) {
            return;
        }

        $header = fgetcsv($handle, 0, ';');
        $indexes = array_flip($header ?: []);
        $totals = [];

        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            $name = $row[$indexes['nom_emplacement_trouve']] ?? null;
            $hour = (int) ($row[$indexes['heure']] ?? -1);
            $value = (float) str_replace(',', '.', $row[$indexes['Pourcentage_validations']] ?? 0);
            $zoneId = $name ? $zoneIdsByName->get($name) : null;

            if (! $zoneId || $hour < 0 || $hour > 23) {
                continue;
            }

            $dayType = strtoupper((string) ($row[$indexes['CAT_JOUR']] ?? 'JOHV'));

            if (! in_array($dayType, ['JOHV', 'JOVS', 'SAHV', 'SAVS', 'DIJFP'], true)) {
                continue;
            }

            $key = "{$zoneId}:{$dayType}:{$hour}";
            $totals[$key] ??= [
                'zone_id' => $zoneId,
                'jour_type' => $dayType,
                'hour' => $hour,
                'sum' => 0,
                'count' => 0,
            ];
            $totals[$key]['sum'] += $value;
            $totals[$key]['count']++;
        }

        fclose($handle);

        Densite::query()->delete();

        collect($totals)
            ->map(fn (array $density) => [
                'zone_id' => $density['zone_id'],
                'jour_type' => $density['jour_type'],
                'heure' => sprintf('2026-01-01 %02d:00:00', $density['hour']),
                'densite' => round($density['sum'] / max(1, $density['count']), 2),
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->chunk(500)
            ->each(fn ($chunk) => Densite::insert($chunk->all()));
    }
}
