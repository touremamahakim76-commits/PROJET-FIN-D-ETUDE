/**
 * Badge color-coded (faible / moyenne / forte densite).
 */
const variants = {
  low:    'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100 text-red-700',
  neutral:'bg-slate-100 text-slate-700',
  info:   'bg-calm-100 text-calm-700',
}

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
