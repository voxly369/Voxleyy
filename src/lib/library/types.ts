import type { CreationType } from '../creations/creationTypes.ts'

export type LibraryAuthor = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
}

export type LibraryItem = {
  creationId: string
  isAvailable: boolean
  type: CreationType | null
  title: string | null
  caption: string | null
  bodyExcerpt: string | null
  bodyTruncated: boolean
  coverUrl: string | null
  publishedAt: string | null
  author: LibraryAuthor | null
  savedAt?: string
  percent?: number
  position?: number
  completed?: boolean
  updatedAt?: string
}

export type LibrarySavedCursor = { savedAt: string; creationId: string }

export type ReaderCollection = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  itemCount?: number
}
