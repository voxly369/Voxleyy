import { SIGNUP_COUNTRIES } from './countriesList.generated.ts'

export function guessCountryFromTimeZone(timeZone: string | null | undefined): string | null {
  const tz = timeZone?.trim()
  if (!tz) return null
  const direct = SIGNUP_COUNTRIES.find((country) => country.primaryTimezone === tz)
  if (direct) return direct.code
  return null
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function defaultSignupCountryAndZone(): { country: string; timezone: string } {
  const timezone = browserTimeZone()
  const country = guessCountryFromTimeZone(timezone) ?? ''
  return { country, timezone }
}
