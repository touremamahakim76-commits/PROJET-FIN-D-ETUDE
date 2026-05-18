/**
 * Bouton uniforme avec variantes Tailwind.
 *
 * Props:
 *  - variant : 'primary' | 'secondary' | 'ghost' | 'danger'
 *  - size    : 'sm' | 'md' | 'lg'
 *  - loading : boolean
 *  - icon    : ReactNode (icone Lucide, optionnel)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-calm-600 text-white hover:bg-calm-700 focus:ring-calm-500 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300',
    ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
