import { parseDictionaryResponse, type DictionaryEntry } from './dictionaryWord.ts'

const cache = new Map<string, DictionaryEntry | 'not-found' | 'error'>()

export type DictionaryResult =
  | { status: 'success'; entry: DictionaryEntry }
  | { status: 'not-found' }
  | { status: 'offline' }
  | { status: 'rate-limit' }
  | { status: 'error' }

export function dictionaryCacheGet(word: string): DictionaryResult | null {
  const hit = cache.get(word)
  if (!hit) return null
  if (hit === 'not-found') return { status: 'not-found' }
  if (hit === 'error') return { status: 'error' }
  return { status: 'success', entry: hit }
}

export async function fetchDictionaryEntry(word: string): Promise<DictionaryResult> {
  const cached = dictionaryCacheGet(word)
  if (cached) return cached
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'offline' }
  }
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (response.status === 404) {
      cache.set(word, 'not-found')
      return { status: 'not-found' }
    }
    if (response.status === 429) return { status: 'rate-limit' }
    if (!response.ok) {
      cache.set(word, 'error')
      return { status: 'error' }
    }
    const json: unknown = await response.json()
    const entry = parseDictionaryResponse(json, word)
    if (!entry) {
      cache.set(word, 'error')
      return { status: 'error' }
    }
    cache.set(word, entry)
    return { status: 'success', entry }
  } catch {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'offline' }
    cache.set(word, 'error')
    return { status: 'error' }
  }
}

export function dictionarySearchUrl(word: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(word + ' definition')}`
}
