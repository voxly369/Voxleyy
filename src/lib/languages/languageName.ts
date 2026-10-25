import { LANGUAGES_LIST } from './languagesList.generated.ts'

const BY_CODE = new Map(LANGUAGES_LIST.map((entry) => [entry.code, entry]))

export function languageDisplayName(code: string | null | undefined): string {
  const trimmed = code?.trim().toLowerCase()
  if (!trimmed) return 'Unknown'
  const entry = BY_CODE.get(trimmed)
  return entry?.nameNative ?? entry?.nameEn ?? trimmed
}

export function languageEnglishName(code: string | null | undefined): string {
  const trimmed = code?.trim().toLowerCase()
  if (!trimmed) return 'Unknown'
  const entry = BY_CODE.get(trimmed)
  return entry?.nameEn ?? trimmed
}
