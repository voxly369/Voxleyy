import { z } from 'zod'
import { parseRichDocument, type RichBodyDocument } from '../creations/richDocument.ts'

export const chapterTitleSchema = z
  .string()
  .trim()
  .min(1, 'Chapter title is required.')
  .max(150, 'Chapter title must be 150 characters or fewer.')

export const chapterDraftSchema = z
  .object({
    title: chapterTitleSchema,
    bodyText: z.string(),
    isSample: z.boolean().optional(),
    status: z.enum(['draft', 'published', 'unlisted', 'removed']).optional(),
  })
  .strict()

export type ChapterDraftInput = z.infer<typeof chapterDraftSchema>

export function parseChapterRichBody(value: unknown): RichBodyDocument | null {
  return parseRichDocument(value)
}

export type ChapterDetail = {
  id: string
  bookId: string
  position: number
  title: string
  bodyText: string | null
  bodyJson: RichBodyDocument | null
  status: 'draft' | 'published' | 'unlisted' | 'removed'
  isSample: boolean
  wordCount: number
  publishedAt: string | null
  updatedAt: string
}
