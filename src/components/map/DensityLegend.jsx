import { DENSITY_COLORS, DENSITY_LABELS } from '../../mocks/zones'

/**
 * Legende du code couleur affichee dans un coin de la carte.
 */
export default function DensityLegend({ className = '' }) {
  const levels = ['low', 'medium', 'high']
  return (
    <div className={`card p-3 text-xs space-y-1.5 ${className}`}>
      <div className="font-semibold text-slate-700 mb-1">Densite</div>
      {levels.map((lvl) => (
        <div key={lvl} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: DENSITY_COLORS[lvl] }}
          />
          <span className="text-slate-600">{DENSITY_LABELS[lvl]}</span>
        </div>
      ))}
    </div>
  )
}
