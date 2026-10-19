import { z } from 'zod'
import type { Json } from '../database.types.ts'

/** Plain-text editor snapshot stored alongside body_text for future rich-text (spec §3, §5). */
export type PlainBodyDocument = {
  version: 1
  format: 'plain'
  text: string
}

export type QuoteCardSize = 'small' | 'medium' | 'large'

export type QuoteCardStyle = {
  background: string
  color: string
  size: QuoteCardSize
}

export type QuoteCardBodyDocument = {
  version: 1
  format: 'quote_card'
  text: string
  style: QuoteCardStyle
}

export type BodyDocument = PlainBodyDocument | QuoteCardBodyDocument

export const DEFAULT_QUOTE_CARD_STYLE: QuoteCardStyle = {
  background: '#1a1a1a',
  color: '#f5f5f5',
  size: 'medium',
}

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const quoteCardSizeSchema = z.enum(['small', 'medium', 'large'])

const quoteCardStyleSchema = z.object({
  background: hexColorSchema,
  color: hexColorSchema,
  size: quoteCardSizeSchema,
})

const plainBodySchema = z.object({
  version: z.literal(1),
  format: z.literal('plain'),
  text: z.string(),
})

const quoteCardBodySchema = z.object({
  version: z.literal(1),
  format: z.literal('quote_card'),
  text: z.string(),
  style: quoteCardStyleSchema,
})

const bodyDocumentSchema = z.discriminatedUnion('format', [plainBodySchema, quoteCardBodySchema])

export function parseBodyDocument(value: Json | null | undefined): BodyDocument | null {
  if (value === null || value === undefined) return null
  const parsed = bodyDocumentSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function bodyTextFromJson(value: Json | null | undefined): string {
  const doc = parseBodyDocument(value)
  if (doc) return doc.text
  return ''
}

export function quoteStyleFromJson(value: Json | null | undefined): QuoteCardStyle {
  const doc = parseBodyDocument(value)
  if (doc?.format === 'quote_card') return doc.style
  return DEFAULT_QUOTE_CARD_STYLE
}

export function bodyDocumentFromText(text: string): PlainBodyDocument {
  return { version: 1, format: 'plain', text }
}

export function bodyJsonFromText(text: string): PlainBodyDocument {
  return bodyDocumentFromText(text)
}

export function quoteCardBodyJson(text: string, style: QuoteCardStyle): QuoteCardBodyDocument {
  const safeStyle = quoteCardStyleSchema.safeParse(style)
  return {
    version: 1,
    format: 'quote_card',
    text,
    style: safeStyle.success ? safeStyle.data : DEFAULT_QUOTE_CARD_STYLE,
  }
}

export function isValidHexColor(value: string): boolean {
  return hexColorSchema.safeParse(value).success
}

export function countLines(text: string): number {
  if (!text) return 0
  return text.split('\n').length
}

export function bodyOctets(text: string): number {
  return new TextEncoder().encode(text).length
}

export function hasEditorContent(title: string, body: string, tags: string[], caption?: string): boolean {
  return Boolean(title.trim() || body.trim() || tags.length > 0 || caption?.trim())
}
