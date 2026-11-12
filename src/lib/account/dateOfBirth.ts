const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const MIN_SIGNUP_AGE_YEARS = 13
export const MATURE_MIN_AGE_YEARS = 18

export function parseIsoDateOnly(value: string): Date | null {
  const trimmed = value.trim()
  if (!DATE_PATTERN.test(trimmed)) return null
  const [y, m, d] = trimmed.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return date
}

export function ageInYearsFromDateOfBirth(dateOfBirth: string, asOf: Date = new Date()): number | null {
  const born = parseIsoDateOnly(dateOfBirth)
  if (!born) return null
  const today = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()))
  if (born.getTime() > today.getTime()) return null
  let years = today.getUTCFullYear() - born.getUTCFullYear()
  const monthDelta = today.getUTCMonth() - born.getUTCMonth()
  const dayDelta = today.getUTCDate() - born.getUTCDate()
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) years -= 1
  return years
}

export function meetsMinimumSignupAge(dateOfBirth: string, asOf: Date = new Date()): boolean {
  const age = ageInYearsFromDateOfBirth(dateOfBirth, asOf)
  return age !== null && age >= MIN_SIGNUP_AGE_YEARS
}

export function viewerIsAdultByDateOfBirth(dateOfBirth: string | null, asOf: Date = new Date()): boolean {
  if (!dateOfBirth) return false
  const age = ageInYearsFromDateOfBirth(dateOfBirth, asOf)
  return age !== null && age >= MATURE_MIN_AGE_YEARS
}
