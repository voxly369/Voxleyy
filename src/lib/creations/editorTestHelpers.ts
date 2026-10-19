import type { Json } from '../database.types.ts'
import { bodyJsonFromText, quoteCardBodyJson, type QuoteCardStyle } from './bodyDocument.ts'
import type { CreationType } from './creationTypes.ts'

export function buildBodyJsonForTest(type: CreationType, body: string, quoteStyle: QuoteCardStyle): Json {
  if (type === 'quote_card') return quoteCardBodyJson(body, quoteStyle) as Json
  return bodyJsonFromText(body) as Json
}
