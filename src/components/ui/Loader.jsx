/**
 * Spinner simple (Tailwind only, sans dependance externe)
 */
export default function Loader({ fullscreen = false, label = 'Chargement...' }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-calm-200 border-t-calm-600" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    )
  }
  return <div className="flex justify-center py-8">{spinner}</div>
}
