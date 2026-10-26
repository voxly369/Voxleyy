import { z } from 'zod'
import { MAX_TITLE_CHARS } from '../creations/creationTypes.ts'

export const bookSaleModels = ['free', 'purchase', 'rental', 'subscription'] as const
export type BookSaleModel = (typeof bookSaleModels)[number]

export const bookEntitlementKinds = ['free', 'purchase', 'rental', 'subscription', 'author'] as const
export type BookEntitlementKind = (typeof bookEntitlementKinds)[number]

export const bookCurrencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, 'Use a three-letter currency code.')

export const bookSubtitleSchema = z
  .string()
  .trim()
  .min(1, 'Subtitle cannot be empty.')
  .max(150, 'Subtitle must be 150 characters or fewer.')
  .optional()
  .nullable()

export const bookDescriptionSchema = z
  .string()
  .max(4000, 'Description must be 4000 characters or fewer.')

export const bookTitleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required.')
  .max(MAX_TITLE_CHARS, `Title must be ${MAX_TITLE_CHARS} characters or fewer.`)

export const bookMetadataSchema = z
  .object({
    title: bookTitleSchema,
    subtitle: bookSubtitleSchema,
    description: bookDescriptionSchema,
    saleModel: z.enum(bookSaleModels),
    priceCents: z.number().int().min(0),
    currency: bookCurrencySchema,
    rentalDays: z.number().int().min(1).max(365).nullable(),
    voxlyBookId: z.string().trim().max(32).nullable().optional(),
    language: z.string().regex(/^[a-z]{2,8}$/, 'Choose a language.'),
  })
  .strict()

export type BookMetadataInput = z.infer<typeof bookMetadataSchema>

export type BookRecord = {
  id: string
  authorId: string
  title: string
  subtitle: string | null
  description: string
  coverUrl: string | null
  status: 'draft' | 'published' | 'unlisted' | 'removed'
  audience: 'public' | 'unlisted' | 'private'
  saleModel: BookSaleModel
  priceCents: number
  currency: string
  rentalDays: number | null
  voxlyBookId: string | null
  language: string
  updatedAt: string
  author?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    verified: boolean
  }
}

export type BookTocChapter = {
  id: string
  bookId: string
  position: number
  title: string
  status: 'draft' | 'published' | 'unlisted' | 'removed'
  isSample: boolean
  publishedAt: string | null
  comingSoon: boolean
}

export type LibraryBookRow = {
  bookId: string
  title: string
  coverUrl: string | null
  authorId: string
  authorUsername: string
  authorDisplayName: string | null
  saleModel: BookSaleModel
  percent: number
  lastChapterId: string | null
  lastReadAt: string | null
  readingStatus: 'Finished' | 'Reading' | 'Not started'
  rentalExpiresAt: string | null
  rentalDaysLeft: number | null
}
