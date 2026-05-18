import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Bell, ChevronDown, ChevronUp, Clock, ListOrdered, Route as RouteIcon, Save, Search, Sparkles, Zap } from 'lucide-react'
import { zonesApi } from '../api/zones'
import { routesApi } from '../api/routes'
import { useAuth } from '../context/AuthContext'
import MapView from '../components/map/MapView'
import DensityLegend from '../components/map/DensityLegend'
import HourSlider from '../components/map/HourSlider'
import DayTypeSlider from '../components/map/DayTypeSlider'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Badge from '../components/ui/Badge'
import { DENSITY_COLORS, DENSITY_LABELS } from '../mocks/zones'
import { DEFAULT_DAY_TYPE, getDayTypeLabel } from '../constants/dayTypes'

const ROUTE_CHOICES = [
  {
    key: 'fast',
    title: 'Normale - rapide',
    subtitle: 'temps uniquement',
    trace: 'trace rouge',
    color: '#ef4444',
    ring: 'ring-red-200',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: Zap,
  },
  {
    key: 'balanced',
    title: 'Equilibree',
    subtitle: 'temps + intensite',
    trace: 'trace orange',
    color: '#f59e0b',
    ring: 'ring-amber-200',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: RouteIcon,
  },
  {
    key: 'calm',
    title: 'Plus calme',
    subtitle: 'intensite minimale',
    trace: 'trace verte',
    color: '#22c55e',
    ring: 'ring-green-200',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: Sparkles,
  },
]

/**
 * Page de calcul de trajet :
 *  - choix d une zone de depart et d arrivee
 *  - calcul de l itineraire rapide vs calme
 *  - sauvegarde possible si connecte
 */
export default function RoutePlanner() {
  const { isAuthenticated } = useAuth()
  const [hour, setHour] = useState(new Date().getHours())
  const [dayType, setDayType] = useState(DEFAULT_DAY_TYPE)
  const [zones, setZones] = useState([])
  const [departId, setDepartId] = useState('')
  const [arriveeId, setArriveeId] = useState('')
  const [timeMode, setTimeMode] = useState('depart')
  const [route, setRoute] = useState(null)
  const [selectedRouteKey, setSelectedRouteKey] = useState('balanced')
  const [departSearch, setDepartSearch] = useState('')
  const [arriveeSearch, setArriveeSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [saveState, setSaveState] = useState({ savingKey: null, savedKeys: {}, error: null })
  const [error, setError] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState({ fast: false, balanced: false, calm: false })
  const [alertsOpen, setAlertsOpen] = useState(false)

  const isOfficialRoute = route?.method === 'official_idfm_navitia'
  const hasCalmRoute = Boolean(route?.calm)
  const hasBalancedRoute = Boolean(route?.balanced)
  const shouldShowOfficialBalanced = isOfficialRoute
    && hasBalancedRoute
    && (!hasCalmRoute || Number(route?.calm?.duree_min ?? 0) > 120)
  const visibleRouteChoices = isOfficialRoute
    ? ROUTE_CHOICES.filter((choice) => choice.key !== 'balanced' || shouldShowOfficialBalanced)
        .filter((choice) => choice.key !== 'calm' || hasCalmRoute)
    : ROUTE_CHOICES
  const selectedRoute = route?.[selectedRouteKey] ?? route?.[visibleRouteChoices[0]?.key] ?? null
  const selectedChoice = visibleRouteChoices.find((choice) => choice.key === selectedRouteKey) ?? visibleRouteChoices[0] ?? ROUTE_CHOICES[0]
  const timeRecommendation = route?.time_recommendation?.available ? route.time_recommendation : null
  const highIntensityZones = useMemo(() => (
    zones
      .filter((zone) => zone.densite?.level === 'high' || Number(zone.densite?.value ?? 0) >= 9)
      .sort((a, b) => Number(b.densite?.value ?? 0) - Number(a.densite?.value ?? 0))
  ), [zones])

  useEffect(() => {
    setLoading(true)
    zonesApi.list(hour, dayType)
      .then(setZones)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [hour, dayType])

  const handleCalculate = async (e) => {
    e.preventDefault()
    if (!departId || !arriveeId) return
    if (departId === arriveeId) {
      setError('Choisissez deux zones differentes')
      return
    }
    setError(null)
    setCalculating(true)
    setSaveState({ savingKey: null, savedKeys: {}, error: null })
    try {
      const r = await routesApi.calculate(Number(departId), Number(arriveeId), hour, timeMode, dayType)
      setRoute(r)
      setSelectedRouteKey('fast')
      setDetailsOpen({ fast: false, balanced: false, calm: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setCalculating(false)
    }
  }

  const handleSaveRoute = async (routeKey) => {
    const routeToSave = route?.[routeKey]
    if (!routeToSave || saveState.savingKey) return

    const dep = zones.find((z) => z.id === Number(departId))
    const arr = zones.find((z) => z.id === Number(arriveeId))
    const choice = ROUTE_CHOICES.find((item) => item.key === routeKey)

    setSaveState((current) => ({ ...current, savingKey: routeKey, error: null }))

    try {
      await routesApi.save({
        nom: `${choice?.title ?? 'Trajet'} : ${dep?.nom ?? 'Depart'} -> ${arr?.nom ?? 'Arrivee'}`,
        depart: dep?.nom ?? routeToSave.stations?.[0] ?? 'Depart',
        arrivee: arr?.nom ?? routeToSave.stations?.[routeToSave.stations.length - 1] ?? 'Arrivee',
        distance_km: Number(routeToSave.distance_km ?? 0),
        duree_min: Number(routeToSave.duree_min ?? 0),
        densite_max: routeToSave.intensite_label ?? routeToSave.densite_max ?? 'medium',
        favori: false,
        route_type: routeKey,
        route_label: choice?.title ?? 'Trajet',
        hour,
        day_type: dayType,
        day_type_label: getDayTypeLabel(dayType),
        time_mode: timeMode,
        departure_time: routeToSave.departure_time,
        arrival_time: routeToSave.arrival_time,
        intensite_moyenne: routeToSave.intensite_moyenne,
        intensite_max: routeToSave.intensite_max,
        stations: routeToSave.stations ?? [],
        station_details: routeToSave.station_details ?? [],
        segments: routeToSave.segments ?? [],
        coordinates: routeToSave.coordinates ?? [],
        method: route?.method,
      })

      setSaveState((current) => ({
        savingKey: null,
        savedKeys: { ...current.savedKeys, [routeKey]: true },
        error: null,
      }))
    } catch (err) {
      setSaveState((current) => ({
        ...current,
        savingKey: null,
        error: err.message ?? 'Impossible de sauvegarder ce trajet',
      }))
    }
  }

  const toggleDetails = (type) => {
    setDetailsOpen((current) => ({
      ...current,
      [type]: !current[type],
    }))
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calculer un trajet</h1>
          <p className="mt-1 text-sm text-slate-500">
            Comparez l itineraire rapide et l itineraire calme evitant les zones bondees.
          </p>
        </div>
        <IntensityAlertBell
          zones={highIntensityZones}
          hour={hour}
          dayType={dayType}
          open={alertsOpen}
          onToggle={() => setAlertsOpen((value) => !value)}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Carte */}
        <div className="min-w-0 space-y-3">
          {loading && zones.length === 0 ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-100 bg-white sm:h-[520px] lg:h-[600px]">
              <Loader />
            </div>
          ) : (
            <MapView
              zones={zones}
              selectedRoute={selectedRoute}
              routeColor={selectedChoice.color}
            />
          )}
          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
            <DayTypeSlider value={dayType} onChange={setDayType} />
            <HourSlider hour={hour} onChange={setHour} />
          </div>
        </div>

        {/* Formulaire + resultats */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          <form onSubmit={handleCalculate} className="card p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-700 mb-1">Itineraire</div>

            <StationSearchSelect
              label="Depart"
              value={departId}
              onChange={setDepartId}
              zones={zones}
              search={departSearch}
              onSearchChange={setDepartSearch}
              placeholder="Rechercher une station de depart"
            />

            <StationSearchSelect
              label="Arrivee"
              value={arriveeId}
              onChange={setArriveeId}
              zones={zones}
              search={arriveeSearch}
              onSearchChange={setArriveeSearch}
              placeholder="Rechercher une station d arrivee"
            />

            <div className="space-y-2">
              <label className="label text-xs">Horaire du trajet</label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                {[
                  { value: 'depart', label: 'Depart' },
                  { value: 'arrivee', label: 'Arrivee' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTimeMode(option.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      timeMode === option.value
                        ? 'bg-white text-calm-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="input"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {`${String(i).padStart(2, '0')}h00`}
                  </option>
                ))}
              </select>
              <div className="rounded-lg bg-calm-50 px-3 py-2 text-xs text-calm-800">
                {getDayTypeLabel(dayType)}
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 rounded-lg p-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={calculating}
              icon={<RouteIcon size={14} />}
              className="w-full"
            >
              Calculer le trajet
            </Button>
          </form>

          <DensityLegend />

          {/* Resultats */}
          {route && (
            <div className="space-y-3 animate-fade-in">
              <div className="card p-4">
                <div className="text-sm font-semibold text-slate-900">Choisir le trace a afficher</div>
                <p className="mt-1 text-xs text-slate-500">
                  Une seule recommandation est affichee sur la carte. Le score d intensite compare surtout les stations intermediaires, car le depart et l arrivee sont imposes.
                </p>
                <p className="mt-2 text-xs text-calm-700">
                  {route.method === 'official_idfm_navitia'
                    ? !route.calm
                      ? 'Calcul officiel IDFM/Navitia : aucune alternative plus calme fiable n a ete trouvee, donc le site ne duplique pas le rapide en vert.'
                      : shouldShowOfficialBalanced
                      ? 'Calcul officiel IDFM/Navitia : le trajet calme depasse 120 min, donc une proposition equilibree orange est ajoutee.'
                      : 'Calcul officiel IDFM/Navitia : on compare le rapide et le plus calme. L orange apparait seulement si le calme depasse 120 min.'
                    : 'Mode secours local : les temps et correspondances sont estimes, activez IDFM/Navitia pour des trajets officiels.'}
                </p>
                {!route.calm && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {route.calm_unavailable_reason ?? 'Aucune alternative plus calme fiable n a ete trouvee pour ce trajet.'}
                  </div>
                )}
              </div>

              {visibleRouteChoices.map((choice) => (
                <RouteChoiceCard
                  key={choice.key}
                  choice={choice}
                  route={route[choice.key]}
                  selected={selectedRouteKey === choice.key}
                  detailsOpen={detailsOpen[choice.key]}
                  isAuthenticated={isAuthenticated}
                  saving={saveState.savingKey === choice.key}
                  saved={Boolean(saveState.savedKeys[choice.key])}
                  onSelect={() => setSelectedRouteKey(choice.key)}
                  onToggleDetails={() => toggleDetails(choice.key)}
                  onSave={() => handleSaveRoute(choice.key)}
                />
              ))}

              {saveState.error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {saveState.error}
                </div>
              )}

              {timeRecommendation && (
                <TimeRecommendationCard
                  recommendation={timeRecommendation}
                  onApplyHour={(recommendedHour) => setHour(recommendedHour)}
                />
              )}

              {/* Comparaison rapide */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Clock size={14} /> Comparaison
                </div>
                <p className="text-xs text-slate-600">
                  Densite estimee pour {getDayTypeLabel(dayType).toLowerCase()}, a l heure{' '}
                  {timeMode === 'depart' ? 'de depart' : 'd arrivee'} :{' '}
                  <strong>{String(hour).padStart(2, '0')}h00</strong>.{' '}
                  Le trace selectionne est <strong>{selectedChoice.title.toLowerCase()}</strong> :{' '}
                  {selectedRoute?.duree_min} min, {selectedRoute?.intensite_moyenne}% d intensite moyenne sur le trajet.
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs">
                  {route.fast && (
                    <Badge variant={route.fast.intensite_label}>{DENSITY_LABELS[route.fast.intensite_label]}</Badge>
                  )}
                  {route.balanced && (!isOfficialRoute || shouldShowOfficialBalanced) && (
                    <>
                      <ArrowRight size={12} className="text-slate-400" />
                      <Badge variant={route.balanced.intensite_label}>{DENSITY_LABELS[route.balanced.intensite_label]}</Badge>
                    </>
                  )}
                  {route.calm && (
                    <>
                      <ArrowRight size={12} className="text-slate-400" />
                      <Badge variant={route.calm.intensite_label}>{DENSITY_LABELS[route.calm.intensite_label]}</Badge>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function IntensityAlertBell({ zones, hour, dayType, open, onToggle }) {
  const count = zones.length
  const topZones = zones.slice(0, 6)

  return (
    <div className="relative self-start">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-sm transition-colors ${
          count > 0
            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        <span className="relative">
          <Bell size={16} />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
        Alertes intensite
      </button>

      {open && (
        <div className="absolute right-0 z-[1000] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className={count > 0 ? 'mt-0.5 text-red-500' : 'mt-0.5 text-green-500'} />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {count > 0 ? `${count} zone(s) forte(s)` : 'Aucune zone forte'}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {String(hour).padStart(2, '0')}h00 - {getDayTypeLabel(dayType)}
              </p>
            </div>
          </div>

          {count > 0 ? (
            <div className="mt-3 space-y-2">
              {topZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-900">{zone.nom}</div>
                    <div className="truncate text-[11px] text-slate-500">{zone.description}</div>
                  </div>
                  <Badge variant="high">{zone.densite.value}%</Badge>
                </div>
              ))}
              {count > topZones.length && (
                <div className="text-[11px] text-slate-500">
                  + {count - topZones.length} autre(s) zone(s) chargee(s)
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Pour cette heure et ce type de jour, aucune zone ne depasse le seuil fort.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function StationSearchSelect({
  label,
  value,
  onChange,
  zones,
  search,
  onSearchChange,
  placeholder,
}) {
  const filteredZones = useMemo(() => {
    const query = normalizeStationName(search)

    if (!query) {
      return zones
    }

    return zones.filter((zone) => normalizeStationName(zone.nom).includes(query))
  }, [zones, search])

  const visibleZones = useMemo(() => {
    if (!value) {
      return filteredZones.slice(0, 120)
    }

    const selectedZone = zones.find((zone) => String(zone.id) === String(value))
    const withoutSelected = filteredZones.filter((zone) => String(zone.id) !== String(value))
    return selectedZone ? [selectedZone, ...withoutSelected.slice(0, 119)] : withoutSelected.slice(0, 120)
  }, [filteredZones, value, zones])

  return (
    <div className="space-y-1.5">
      <label className="label text-xs">{label}</label>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input pl-9"
          placeholder={placeholder}
          type="search"
        />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        required
      >
        <option value="">-- Choisir une zone --</option>
        {visibleZones.map((z) => (
          <option key={z.id} value={z.id}>{z.nom}</option>
        ))}
      </select>
      {search && (
        <div className="text-[11px] text-slate-400">
          {filteredZones.length} station{filteredZones.length > 1 ? 's' : ''} trouvee{filteredZones.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

function RouteChoiceCard({
  choice,
  route,
  selected,
  detailsOpen,
  isAuthenticated,
  saving,
  saved,
  onSelect,
  onToggleDetails,
  onSave,
}) {
  if (!route) {
    return null
  }

  const Icon = choice.icon

  return (
    <div className={`card p-4 ${selected ? `ring-2 ${choice.ring}` : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center text-white"
            style={{ backgroundColor: choice.color }}
          >
            <Icon size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{choice.title}</div>
            <div className="text-[10px] text-slate-400">{choice.subtitle} - {choice.trace}</div>
          </div>
        </div>
        <Badge variant={route.intensite_label ?? route.densite_max}>
          {DENSITY_LABELS[route.intensite_label ?? route.densite_max]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-2">
        <div>
          <div className="font-mono text-base text-slate-900">{route.distance_km} km</div>
          distance
        </div>
        <div>
          <div className="font-mono text-base text-slate-900">{route.duree_min} min</div>
          duree
        </div>
        <div>
          <div className="font-mono text-base text-slate-900">{route.intensite_moyenne}%</div>
          moy. trajet
        </div>
        <div>
          <div className="font-mono text-base text-slate-900">{route.intensite_max}%</div>
          pic trajet
        </div>
      </div>

      <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs text-slate-500">
        <div>
          {route.departure_time} {'->'} {route.arrival_time}
        </div>
        {route.detour && route.via_station && (
          <div className="mt-1 font-medium text-green-700">
            Detour calme via {route.via_station}
          </div>
        )}
        <div className="mt-1 truncate" title={route.stations?.join(' -> ')}>
          {route.stations?.slice(0, 5).join(' -> ')}
          {route.stations?.length > 5 ? '...' : ''}
        </div>
      </div>

      <div className={`mt-3 grid gap-2 ${isAuthenticated ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
        <button
          type="button"
          onClick={onSelect}
          className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium ${
            selected
              ? `${choice.border} ${choice.text} bg-white`
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {selected ? 'Trace affiche' : 'Voir ce trace'}
        </button>
        <button
          type="button"
          onClick={onToggleDetails}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <ListOrdered size={14} />
          Details
          {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {isAuthenticated && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || saved}
            className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1 ${
              saved
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {saving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save size={14} />
            )}
            {saved ? 'Sauvegarde' : 'Sauver'}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <Link to="/login" className="font-medium text-calm-700 hover:underline">
            Connectez-vous
          </Link>{' '}
          pour sauvegarder cette recommandation.
        </div>
      )}

      {detailsOpen && <RouteDetails route={route} />}
    </div>
  )
}

function TimeRecommendationCard({ recommendation, onApplyHour }) {
  const routeLabels = {
    fast: 'trajet rapide',
    balanced: 'compromis equilibre',
    calm: 'trajet le plus calme',
  }
  const recommendedHour = `${String(recommendation.recommended_hour).padStart(2, '0')}h00`
  const currentHour = `${String(recommendation.current_hour).padStart(2, '0')}h00`
  const averageGain = Number(recommendation.gain_moyen ?? 0)
  const peakGain = Number(recommendation.gain_pic ?? 0)

  return (
    <div className="card border-calm-100 bg-calm-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-calm-600 text-white">
          <Clock size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">Meilleur horaire conseille</div>
          <p className="mt-1 text-xs text-slate-600">{recommendation.message}</p>
          <p className="mt-1 text-[11px] text-slate-500">{recommendation.explanation}</p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white px-3 py-2">
              <div className="text-slate-500">Maintenant</div>
              <div className="font-mono text-sm text-slate-900">{currentHour}</div>
              <div className="text-slate-500">{recommendation.current_intensite_moyenne}% moy.</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-2">
              <div className="text-slate-500">Plus serein</div>
              <div className="font-mono text-sm text-calm-700">{recommendedHour}</div>
              <div className="text-slate-500">{recommendation.recommended_intensite_moyenne}% moy.</div>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Base : {routeLabels[recommendation.basis_route] ?? 'trajet selectionne'}.
            {averageGain > 0 || peakGain > 0
              ? ` Gain estime : ${Math.max(0, averageGain).toFixed(2)} pt moyen, ${Math.max(0, peakGain).toFixed(2)} pt au pic.`
              : ' Cette heure est le meilleur creneau estime parmi les horaires de service analyses.'}
          </div>

          <button
            type="button"
            onClick={() => onApplyHour(recommendation.recommended_hour)}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-calm-200 bg-white px-3 py-2 text-xs font-medium text-calm-700 hover:bg-calm-50"
          >
            Mettre cette heure dans le formulaire
          </button>
        </div>
      </div>
    </div>
  )
}

function RouteDetails({ route }) {
  const stations = route.station_details ?? []
  const segments = route.segments ?? []

  if (stations.length === 0) {
    return null
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-slate-700">
        Stations empruntees ({stations.length})
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {stations.map((station, index) => {
          const segment = segments[index - 1]
          const hasIntensity = station.intensite_available !== false && station.intensite_level && station.intensite !== null && station.intensite !== undefined
          const color = hasIntensity ? DENSITY_COLORS[station.intensite_level] : '#94a3b8'
          return (
            <div key={`${station.id}-${index}`} className="relative pl-5">
              {index < stations.length - 1 && (
                <span className="absolute left-[5px] top-5 h-full w-px bg-slate-200" />
              )}
              <span
                className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                style={{ backgroundColor: color }}
              />
              <div className="rounded-md bg-slate-50 px-2.5 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{station.nom}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {station.ligne || station.mode || 'Station'}
                    </div>
                  </div>
                  {hasIntensity ? (
                    <Badge variant={station.intensite_level}>
                      {DENSITY_LABELS[station.intensite_level]} {station.intensite}%
                    </Badge>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      Non calcule
                    </span>
                  )}
                </div>
                {segment && (
                  <div className="mt-2 text-[11px] text-slate-500">
                    Depuis {segment.from} : {formatSegmentLines(segment.lines)} - {segment.duree_min} min - {segment.distance_km} km
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatSegmentLines(lines = []) {
  if (!lines.length) {
    return 'Correspondance'
  }

  return lines.join(' / ')
}

function normalizeStationName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
