import { forwardRef } from 'react'

/**
 * Input avec label + message d erreur integre.
 */
const Input = forwardRef(function Input(
  { label, error, id, className = '', icon, ...rest },
  ref,
) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input ${icon ? 'pl-10' : ''} ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''
          } ${className}`}
          {...rest}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
})

export default Input
