import { useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { TextField } from './TextField.tsx'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
  hint?: string
  name?: string
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
  name,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      id={id}
      name={name ?? id}
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete={autoComplete}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      error={error}
      hint={hint}
      trailing={
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
          className={`absolute right-1 top-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-2 text-sm font-medium text-muted ${focusRing}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  )
}
