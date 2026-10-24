const COUNTRY = /^[A-Z]{2}$/
const ROLE = /^(reader|writer|founder)$/

export function normalizeCountryFilter(value: string): string | null {
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return null
  return COUNTRY.test(trimmed) ? trimmed : null
}

export function normalizeRoleFilter(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  return ROLE.test(trimmed) ? trimmed : null
}

export function filterValidationError(country: string, role: string): string | null {
  if (country.trim() && !normalizeCountryFilter(country)) return 'Country must be a two-letter code.'
  if (role.trim() && !normalizeRoleFilter(role)) return 'Role must be reader or writer.'
  return null
}
