import { focusRing } from '../shell/navItems.ts'

type MfaCodeFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  disabled?: boolean
}

export function MfaCodeField({
  id,
  value,
  onChange,
  label = 'Authenticator code',
  error,
  disabled,
}: MfaCodeFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-ink">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        className={`min-h-11 rounded-2xl border border-line bg-bg px-3 text-base tracking-widest ${focusRing}`}
        data-testid={id}
      />
      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
    </div>
  )
}
