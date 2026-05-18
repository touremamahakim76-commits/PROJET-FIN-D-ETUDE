import { CalendarDays } from 'lucide-react'
import { DAY_TYPES } from '../../constants/dayTypes'

export default function DayTypeSlider({ value, onChange, className = '' }) {
  const activeIndex = Math.max(0, DAY_TYPES.findIndex((type) => type.value === value))

  return (
    <div className={`card p-3 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <CalendarDays size={14} className="text-calm-600" />
          Type de jour
        </div>
        <div className="text-xs font-semibold text-calm-700">
          {DAY_TYPES[activeIndex]?.value}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-100 p-1">
        <div className="relative min-w-[24rem] sm:min-w-0">
          <div
            className="absolute bottom-0 top-0 rounded-lg bg-white shadow-sm transition-all duration-300"
            style={{
              left: `calc(${activeIndex * 20}% + 4px)`,
              width: 'calc(20% - 8px)',
            }}
          />
          <div className="relative grid grid-cols-5 gap-1">
            {DAY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                title={type.label}
                onClick={() => onChange(type.value)}
              className={`min-w-0 truncate rounded-lg px-1.5 py-2 text-center text-[11px] font-medium transition-colors sm:px-2 sm:text-xs ${
                  value === type.value
                    ? 'text-calm-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {DAY_TYPES[activeIndex]?.label}
      </div>
    </div>
  )
}
