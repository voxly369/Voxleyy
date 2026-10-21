import { bookMetadataSchema, type BookMetadataInput, type BookSaleModel } from './bookSchema.ts'
import type { BookTocChapter } from './bookSchema.ts'
import { countWordsInPlainText } from './wordCount.ts'

export type BookValidationIssue = { field: string; message: string }

export type BookValidationResult =
  | { ok: true; data: BookMetadataInput }
  | { ok: false; issues: BookValidationIssue[] }

function salePriceIssues(input: BookMetadataInput): BookValidationIssue[] {
  const issues: BookValidationIssue[] = []
  if (input.saleModel === 'free') {
    if (input.priceCents !== 0) {
      issues.push({ field: 'priceCents', message: 'Free books must have price zero.' })
    }
    return issues
  }
  if (input.priceCents <= 0) {
    issues.push({ field: 'priceCents', message: 'Paid books need a price above zero.' })
  }
  if (input.saleModel === 'rental' && !input.rentalDays) {
    issues.push({ field: 'rentalDays', message: 'Rental books need a rental period in days.' })
  }
  if (input.saleModel !== 'rental' && input.rentalDays != null) {
    issues.push({ field: 'rentalDays', message: 'Rental days apply only to rental books.' })
  }
  return issues
}

export function validateBookMetadata(raw: unknown): BookValidationResult {
  const parsed = bookMetadataSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'form',
        message: issue.message,
      })),
    }
  }
  const priceIssues = salePriceIssues(parsed.data)
  if (priceIssues.length > 0) return { ok: false, issues: priceIssues }
  return { ok: true, data: parsed.data }
}

export type PublishBookInput = {
  metadata: BookMetadataInput
  hasCover: boolean
  chapters: BookTocChapter[]
}

export function validateBookForPublish(input: PublishBookInput): BookValidationIssue[] {
  const issues: BookValidationIssue[] = []
  const meta = validateBookMetadata(input.metadata)
  if (!meta.ok) issues.push(...meta.issues)
  if (!input.hasCover) issues.push({ field: 'cover', message: 'Add a cover before publishing.' })
  const publishedChapters = input.chapters.filter((ch) => ch.status === 'published' && !ch.comingSoon)
  if (publishedChapters.length === 0) {
    issues.push({ field: 'chapters', message: 'Publish at least one chapter.' })
  }
  return issues
}

export function publishDisabledReason(input: PublishBookInput, paymentsEnabled: boolean): string | null {
  const issues = validateBookForPublish(input)
  if (issues.length > 0) return issues[0]!.message
  if (input.metadata.saleModel !== 'free' && !paymentsEnabled) {
    return 'Paid books can be unlisted until payments are enabled.'
  }
  return null
}

export function formatPrice(saleModel: BookSaleModel, priceCents: number, currency: string): string {
  if (saleModel === 'free') return 'Free'
  const amount = (priceCents / 100).toFixed(2)
  return `${currency} ${amount}`
}

export function minimumChapterBodyWords(body: string): boolean {
  return countWordsInPlainText(body) >= 1
}
