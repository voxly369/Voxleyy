export const COUNTRIES: readonly { code: string; name: string }[] = [
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'IN', name: 'India' },
  { code: 'IE', name: 'Ireland' },
  { code: 'KE', name: 'Kenya' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
]

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
  return COUNTRIES.find((country) => country.code === trimmed)?.name ?? trimmed
}

export function countryFlag(code: string | null): string {
  const trimmed = code?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(trimmed)) return ''
  return String.fromCodePoint(...[...trimmed].map((character) => 0x1f1e6 + character.charCodeAt(0) - 65))
}
