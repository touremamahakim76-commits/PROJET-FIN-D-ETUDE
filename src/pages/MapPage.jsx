import { useEffect, useMemo, useState } from 'react'
import { Filter, RefreshCw } from 'lucide-react'
import { zonesApi } from '../api/zones'
import MapView from '../components/map/MapView'
import DensityLegend from '../components/map/DensityLegend'
import HourSlider from '../components/map/HourSlider'
import DayTypeSlider from '../components/map/DayTypeSlider'
import ZoneDetailPanel from '../components/map/ZoneDetailPanel'
import Loader from '../components/ui/Loader'
import Button from '../components/ui/Button'
import { DENSITY_LABELS } from '../mocks/zones'
import { DEFAULT_DAY_TYPE, getDayTypeLabel } from '../constants/dayTypes'

/**
 * Page Carte - cur de l app.
 * Permet de visualiser les zones, simuler differentes heures et obtenir des predictions IA.
 */
export default function MapPage() {
  const [hour, setHour] = useState(new Date().getHours())
  const [dayType, setDayType] = useState(DEFAULT_DAY_TYPE)
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedZone, setSelectedZone] = useState(null)
  const [filter, setFilter] = useState('all') // all | low | medium | high

  // Charge les zones a chaque changement d heure
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    zonesApi
      .list(hour, dayType)
      .then((data) => {
        if (cancelled) return
        setZones(data)
        // Met a jour la zone selectionnee si elle existe encore
        if (selectedZone) {
          const updated = data.find((z) => z.id === selectedZone.id)
          if (updated) setSelectedZone(updated)
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, dayType])

  // Filtre cote client
  const visibleZones = useMemo(() => {
    if (filter === 'all') return zones
    return zones.filter((z) => z.densite.level === filter)
  }, [zones, filter])

  // Stats a afficher en haut du panel
  const stats = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 }
    zones.forEach((z) => counts[z.densite.level]++)
    return counts
  }, [zones])

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carte des densites</h1>
          <p className="text-sm text-slate-500">
            Cliquez sur une zone pour voir le detail et la prediction IA.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={() => setHour(new Date().getHours())}
        >
          Heure actuelle
        </Button>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Colonne carte */}
        <div className="min-w-0 space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && zones.length === 0 ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-100 bg-white sm:h-[520px] lg:h-[600px]">
              <Loader label="Chargement des zones..." />
            </div>
          ) : (
            <MapView
              zones={visibleZones}
              onZoneClick={setSelectedZone}
            />
          )}

          {/* Slider sous la carte */}
          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
            <DayTypeSlider value={dayType} onChange={setDayType} />
            <HourSlider hour={hour} onChange={setHour} />
          </div>
        </div>

        {/* Colonne droite : controles + detail */}
        <aside className="min-w-0 space-y-3">
          {/* Stats */}
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-3">
              Repartition a {String(hour).padStart(2,'0')}h00
              <span className="mt-1 block">{getDayTypeLabel(dayType)}</span>
            </div>
            <div className="space-y-2 text-sm">
              {['low', 'medium', 'high'].map((lvl) => (
                <div key={lvl} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          lvl === 'low' ? '#22c55e' :
                          lvl === 'medium' ? '#f59e0b' : '#ef4444',
                      }}
                    />
                    {DENSITY_LABELS[lvl]}
                  </div>
                  <span className="font-mono text-slate-700">{stats[lvl]} zones</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtre */}
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <Filter size={12} /> Filtrer par densite
            </div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {[
                { v: 'all', label: 'Toutes' },
                { v: 'low', label: 'Faible' },
                { v: 'medium', label: 'Moyenne' },
                { v: 'high', label: 'Forte' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setFilter(opt.v)}
                  className={`text-xs px-2 py-1.5 rounded-md transition-colors ${
                    filter === opt.v
                      ? 'bg-calm-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legende */}
          <DensityLegend />

          {/* Detail zone selectionnee */}
          {selectedZone && (
            <ZoneDetailPanel
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
              currentHour={hour}
              dayType={dayType}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
