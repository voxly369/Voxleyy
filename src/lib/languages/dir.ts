const RTL_LANGUAGE_CODES = new Set([
  'ar',
  'dv',
  'fa',
  'he',
  'ku',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
])

export function isRtlLang(code: string): boolean {
  const base = code.trim().toLowerCase().split('-')[0] ?? ''
  return RTL_LANGUAGE_CODES.has(base)
}

export function contentLangProps(lang: string | null | undefined): {
  lang?: string
  dir?: 'rtl' | 'auto'
} {
  const trimmed = lang?.trim().toLowerCase()
  if (!trimmed || !/^[a-z]{2,8}(-[a-z]{2,8})?$/.test(trimmed)) {
    return { dir: 'auto' }
  }
  return {
    lang: trimmed,
    dir: isRtlLang(trimmed) ? 'rtl' : 'auto',
  }
}
