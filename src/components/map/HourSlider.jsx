import { Clock } from 'lucide-react'

/**
 * Slider pour choisir l heure (0-23) et voir l evolution de la densite.
 */
export default function HourSlider({ hour, onChange, className = '' }) {
  const formatHour = (h) => `${String(h).padStart(2, '0')}h00`
  const progress = (hour / 23) * 100

  return (
    <div className={`card p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Clock size={14} className="text-calm-600" />
          Heure simulee
        </div>
        <div className="text-sm font-mono font-semibold text-calm-700">
          {formatHour(hour)}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={hour}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-calm-600"
        style={{
          background: `linear-gradient(to right, #0284c7 0%, #0284c7 ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%)`,
        }}
      />
      <div className="flex justify-between mt-1 text-[10px] text-slate-400">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  )
}
