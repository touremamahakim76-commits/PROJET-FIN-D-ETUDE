/**
 * Card reutilisable avec entete + contenu optionnels.
 */
export default function Card({ title, subtitle, icon, action, children, className = '' }) {
  return (
    <div className={`card p-4 animate-fade-in sm:p-6 ${className}`}>
      {(title || icon || action) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="rounded-lg bg-calm-50 p-2 text-calm-600">{icon}</div>
            )}
            <div>
              {title && <h3 className="font-semibold text-slate-900">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
