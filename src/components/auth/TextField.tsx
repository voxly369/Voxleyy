import type { InputHTMLAttributes, ReactNode } from 'react'
import { focusRing } from '../shell/navItems.ts'

type TextFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  trailing?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>

export function TextField({ id, label, error, hint, trailing, className, ...props }: TextFieldProps) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`min-h-11 w-full rounded-2xl border border-line bg-bg px-3 text-base text-ink ${trailing ? 'pr-20' : ''} ${className ?? ''} ${focusRing}`}
          {...props}
        />
        {trailing}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" aria-live="polite" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
    </div>
  )
}
