import { z } from 'zod'

/** Accepts RFC-style ids from Supabase and test fixtures (z.uuid rejects some fixture ids). */
const uuidLike = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

export const HIGHLIGHT_COLOURS = ['yellow', 'green', 'blue', 'pink', 'orange'] as const
export type HighlightColour = (typeof HIGHLIGHT_COLOURS)[number]

export const highlightColourSchema = z.enum(HIGHLIGHT_COLOURS)

export const highlightNoteSchema = z.string().max(2000).nullable()

export const highlightQuoteSchema = z.string().min(1).max(1000)

export const readerHighlightSchema = z.object({
  id: uuidLike,
  creationId: uuidLike,
  startParagraph: z.number().int().min(0),
  startChar: z.number().int().min(0),
  endParagraph: z.number().int().min(0),
  endChar: z.number().int().min(0),
  quote: highlightQuoteSchema,
  colour: highlightColourSchema,
  note: highlightNoteSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  unmatched: z.boolean().optional(),
})

export type ReaderHighlight = z.infer<typeof readerHighlightSchema>

export const highlightInsertSchema = readerHighlightSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  unmatched: true,
})

export const bookmarkLabelSchema = z.string().trim().min(1).max(100).nullable()

export const readerBookmarkSchema = z.object({
  id: uuidLike,
  creationId: uuidLike,
  paragraph: z.number().int().min(0),
  paragraphOffset: z.number().min(0).max(1),
  label: bookmarkLabelSchema,
  createdAt: z.string(),
})

export type ReaderBookmark = z.infer<typeof readerBookmarkSchema>
