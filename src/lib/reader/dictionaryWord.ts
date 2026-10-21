import { z } from 'zod'

export const dictionaryWordSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z'-]{1,40}$/, 'Word must be 1–40 letters.')

export function normalizeLookupWord(raw: string): string | null {
  const cleaned = raw.trim().replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/g, '')
  const parsed = dictionaryWordSchema.safeParse(cleaned)
  return parsed.success ? parsed.data.toLowerCase() : null
}

const meaningSchema = z.object({
  partOfSpeech: z.string().optional(),
  definitions: z.array(z.object({ definition: z.string() })).min(1),
})

export const dictionaryResponseSchema = z.array(
  z.object({
    word: z.string(),
    meanings: z.array(meaningSchema).min(1),
  }),
)

export type DictionaryEntry = {
  word: string
  partOfSpeech: string
  definition: string
}

export function parseDictionaryResponse(raw: unknown, word: string): DictionaryEntry | null {
  const parsed = dictionaryResponseSchema.safeParse(raw)
  if (!parsed.success) return null
  const entry = parsed.data[0]
  const meaning = entry.meanings[0]
  const definition = meaning.definitions[0]?.definition
  if (!definition) return null
  return {
    word: entry.word || word,
    partOfSpeech: meaning.partOfSpeech ?? 'unknown',
    definition,
  }
}
