import { useEffect, useState } from 'react'
import { Bookmark, Star, Trash2, Clock, MapPin, ArrowRight } from 'lucide-react'
import { routesApi } from '../api/routes'
import Loader from '../components/ui/Loader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { DENSITY_LABELS } from '../mocks/zones'

export default function SavedRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const data = await routesApi.listSaved()
      setRoutes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce trajet ?')) return
    await routesApi.deleteSaved(id)
    setRoutes((rs) => rs.filter((r) => r.id !== id))
  }

  const handleToggleFavori = async (id) => {
    await routesApi.toggleFavori(id)
    setRoutes((rs) =>
      rs.map((r) => (r.id === id ? { ...r, favori: !r.favori } : r)),
    )
  }

  if (loading) return <Loader />

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes trajets</h1>
          <p className="text-sm text-slate-500">
            Retrouvez vos itineraires sauvegardes
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {routes.length} trajet{routes.length > 1 ? 's' : ''}
        </div>
      </div>

      {routes.length === 0 ? (
        <div className="card p-12 text-center">
          <Bookmark size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600">Aucun trajet sauvegarde pour le moment.</p>
          <p className="text-xs text-slate-400 mt-1">
            Calculez un trajet et sauvegardez-le pour le retrouver ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routes.map((r) => (
            <div key={r.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleFavori(r.id)}
                    className={`p-1 rounded-md transition-colors ${
                      r.favori
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
                    }`}
                    aria-label="Favori"
                  >
                    <Star size={16} fill={r.favori ? 'currentColor' : 'none'} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{r.nom}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                      <MapPin size={11} />
                      <span className="truncate">{r.depart}</span>
                      <ArrowRight size={11} />
                      <span className="truncate">{r.arrivee}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-slate-400 hover:text-red-600 p-1"
                  aria-label="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {(r.route_label || r.departure_time || r.day_type_label) && (
                <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                  {r.route_label && (
                    <span className="rounded-full bg-calm-50 px-2.5 py-1 font-medium text-calm-700">
                      {r.route_label}
                    </span>
                  )}
                  {r.departure_time && r.arrival_time && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                      {r.departure_time} - {r.arrival_time}
                    </span>
                  )}
                  {r.day_type_label && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                      {r.day_type_label}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div className="bg-slate-50 rounded-md p-2">
                  <div className="text-slate-400">Distance</div>
                  <div className="font-mono font-medium text-slate-900">{r.distance_km} km</div>
                </div>
                <div className="bg-slate-50 rounded-md p-2">
                  <div className="text-slate-400">Duree</div>
                  <div className="font-mono font-medium text-slate-900">{r.duree_min} min</div>
                </div>
                <div className="bg-slate-50 rounded-md p-2">
                  <div className="text-slate-400">Densite</div>
                  <Badge variant={r.densite_max} className="mt-0.5">
                    {DENSITY_LABELS[r.densite_max]}
                  </Badge>
                </div>
              </div>

              {(r.intensite_moyenne !== null && r.intensite_moyenne !== undefined) && (
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-400">Intensite moy.</div>
                    <div className="font-mono font-medium text-slate-900">{r.intensite_moyenne}%</div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-400">Pic</div>
                    <div className="font-mono font-medium text-slate-900">{r.intensite_max ?? '-'}%</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  Sauvegarde le {new Date(r.cree_le).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
