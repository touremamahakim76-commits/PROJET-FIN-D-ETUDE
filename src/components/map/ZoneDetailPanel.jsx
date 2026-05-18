import { useEffect, useState } from 'react'
import { Brain, X, TrendingUp, Loader2 } from 'lucide-react'
import { zonesApi } from '../../api/zones'
import { DENSITY_COLORS, DENSITY_LABELS } from '../../mocks/zones'
import { getDayTypeLabel } from '../../constants/dayTypes'
import Badge from '../ui/Badge'

/**
 * Panel lateral qui s ouvre quand on clique sur une zone.
 * Affiche les details + une prediction IA pour une heure choisie.
 */
export default function ZoneDetailPanel({ zone, onClose, currentHour, dayType }) {
  const [predictHour, setPredictHour] = useState(currentHour)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)

  // Reset quand on change de zone
  useEffect(() => {
    setPrediction(null)
    setPredictHour(currentHour)
  }, [zone, currentHour, dayType])

  const runPrediction = async () => {
    setLoading(true)
    try {
      const res = await zonesApi.predict(zone.id, predictHour, dayType)
      setPrediction(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!zone) return null

  return (
    <div className="card p-5 space-y-4 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{zone.nom}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{zone.description}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Densite actuelle */}
      <div className="rounded-lg bg-slate-50 p-3">
        <div className="text-xs text-slate-500 mb-1">
          Densite a {String(currentHour).padStart(2, '0')}h00
          <span className="mt-0.5 block">{getDayTypeLabel(dayType)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: DENSITY_COLORS[zone.densite.level] }}
          />
          <span className="font-medium">
            {DENSITY_LABELS[zone.densite.level]}
          </span>
          <span className="text-sm text-slate-500">({zone.densite.value}%)</span>
        </div>
        {/* Barre de progression visuelle */}
        <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${zone.densite.value}%`,
              backgroundColor: DENSITY_COLORS[zone.densite.level],
            }}
          />
        </div>
      </div>

      {/* Prediction IA */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Brain size={16} className="text-calm-600" />
          Prediction IA
        </div>
        <div className="flex items-center gap-2">
          <select
            value={predictHour}
            onChange={(e) => setPredictHour(Number(e.target.value))}
            className="input flex-1"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{`${String(i).padStart(2,'0')}h00`}</option>
            ))}
          </select>
          <button
            onClick={runPrediction}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            Predire
          </button>
        </div>

        {prediction && (
          <div className="rounded-lg border border-calm-100 bg-calm-50 p-3 text-sm space-y-2 animate-fade-in">
            <p className="text-slate-700">{prediction.message}</p>
            <div className="flex items-center justify-between text-xs">
              <Badge variant={prediction.level}>
                {DENSITY_LABELS[prediction.level]} - {prediction.prediction}%
              </Badge>
              <span className="text-slate-500">
                Confiance : {Math.round(prediction.confidence * 100)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Intervalle : {prediction.interval[0]} - {prediction.interval[1]} %
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
