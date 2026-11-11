import { useId } from 'react'

export default function SelectField({ label, error, className = '', children, ...props }) {
  const id = useId()

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-stone-800">
          {label}
        </label>
      )}
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${label ? 'mt-1 ' : ''}block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-stone-300 focus:border-brand-600 focus:ring-brand-600/20'
        }`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}