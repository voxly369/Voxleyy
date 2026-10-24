import { useMemo, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { SIGNUP_COUNTRIES } from '../../lib/signup/countriesList.generated.ts'
import { countryFlag } from '../../lib/profiles/countries.ts'

type CountryPickerProps = {
  id: string
  label: string
  value: string
  onChange: (code: string) => void
  error?: string
}

export function CountryPicker({ id, label, value, onChange, error }: CountryPickerProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SIGNUP_COUNTRIES
    return SIGNUP_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [query])

  const selectedName = SIGNUP_COUNTRIES.find((c) => c.code === value)?.name

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-search`} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={`${id}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search countries"
        autoComplete="off"
        className={`min-h-11 rounded-2xl border border-line bg-surface px-4 text-base text-ink ${focusRing}`}
        data-testid="signup-country-search"
      />
      <select
        id={id}
        name="country"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        size={6}
        className={`max-h-48 rounded-2xl border border-line bg-surface px-3 py-2 text-base text-ink ${focusRing}`}
        data-testid="signup-country-select"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">Choose a country</option>
        {filtered.map((country) => (
          <option key={country.code} value={country.code}>
            {countryFlag(country.code)} {country.name}
          </option>
        ))}
      </select>
      {selectedName ? (
        <p className="text-sm text-muted" data-testid="signup-country-selected">
          {countryFlag(value)} {selectedName}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
    </div>
  )
}
