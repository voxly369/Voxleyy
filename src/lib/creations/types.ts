import type { Database } from '../database.types.ts'

export type CreationType = Database['public']['Enums']['creation_type']
export type PublishStatus = Database['public']['Enums']['publish_status']
export type Audience = Database['public']['Enums']['audience']

export type CreationAuthor = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
  feedBadges?: import('../badges/types.ts').FeedBadge[]
}

export type WorkSummary = {
  id: string
  type: CreationType
  title: string | null
  caption: string | null
  status: PublishStatus
  audience: Audience
  coverUrl: string | null
  createdAt: string
  language?: string
  author: CreationAuthor
}

export type CreationDetail = WorkSummary & {
  bodyText: string | null
  bodyJson: import('../database.types.ts').Json | null
  genre: string | null
  mood: string | null
  language: string
  updatedAt: string
  isOwn: boolean
  isRemoved: boolean
  removedReason: string | null
}

export type CreationFailure = {
  ok: false
  error: {
    code: 'invalid' | 'forbidden' | 'not_found' | 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type CreationResult<T> = { ok: true; data: T } | CreationFailure

export type DraftInput = {
  type: CreationType
  title?: string | null
  caption?: string | null
  body_text?: string | null
  body_json?: unknown
  genre?: string | null
  mood?: string | null
  language?: string
  audience?: Audience
  tags?: string[]
}

export type EditableCreation = {
  id: string
  type: CreationType
  title: string
  caption: string
  bodyText: string
  coverUrl: string | null
  mood: string | null
  language: string
  status: PublishStatus
  audience: Audience
  updatedAt: string
  tags: string[]
  bodyJson: import('../database.types.ts').Json | null
}

export type DraftListRow = {
  id: string
  type: CreationType
  title: string | null
  status: PublishStatus
  audience: Audience
  updatedAt: string
  removed: boolean
}

export type DraftListPage = {
  rows: DraftListRow[]
  nextCursor: import('./draftsCursor.ts').DraftsCursor | null
}

export type TagSyncWarning = { message: string }

export type SaveCreationResult =
  | { ok: true; updatedAt: string; tagError?: TagSyncWarning }
  | { ok: false; conflict: true; remoteUpdatedAt: string }
  | CreationFailure

export type CreateDraftResult =
  | { ok: true; data: CreationDetail; tagError?: TagSyncWarning }
  | CreationFailure

export type PublishedWorkSummary = {
  id: string
  type: CreationType
  title: string | null
  coverUrl: string | null
  publishedAt: string
  audience: Audience
  likeCount: number
  commentCount: number
  viewCount: number
  bodyText: string | null
  bodyJson: import('../database.types.ts').Json | null
}

export type PublishedWorksPage = {
  works: PublishedWorkSummary[]
  nextCursor: import('./publishedCursor.ts').PublishedCursor | null
}

export type PublishCreationResult =
  | { ok: true; updatedAt: string; audience: Audience; status: PublishStatus }
  | { ok: false; conflict: true; remoteUpdatedAt: string }
  | CreationFailure
