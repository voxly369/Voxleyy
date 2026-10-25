import { SIGNUP_COUNTRIES } from '../signup/countriesList.generated.ts'

export const COUNTRIES: readonly { code: string; name: string }[] = SIGNUP_COUNTRIES.map((country) => ({
  code: country.code,
  name: country.name,
}))

export const LANGUAGES: readonly { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'zu', name: 'isiZulu' },
  { code: 'xh', name: 'isiXhosa' },
  { code: 'nso', name: 'Sepedi' },
  { code: 'st', name: 'Sesotho' },
  { code: 'tn', name: 'Setswana' },
  { code: 'ss', name: 'siSwati' },
  { code: 've', name: 'Tshivenda' },
  { code: 'ts', name: 'Xitsonga' },
  { code: 'nr', name: 'isiNdebele' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish' },
]

export function countryName(code: string | null): string | null {
  if (!code) return null
  const trimmed = code.trim().toUpperCase()
  return SIGNUP_COUNTRIES.find((country) => country.code === trimmed)?.name ?? trimmed
}

export function countryPrimaryTimezone(code: string | null): string | null {
  if (!code) return null
  const trimmed = code.trim().toUpperCase()
  return SIGNUP_COUNTRIES.find((country) => country.code === trimmed)?.primaryTimezone ?? null
}

export function countryFlag(code: string | null): string {
  const trimmed = code?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(trimmed)) return ''
  return String.fromCodePoint(...[...trimmed].map((character) => 0x1f1e6 + character.charCodeAt(0) - 65))
}
