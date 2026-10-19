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
  author: CreationAuthor
}

export type CreationDetail = WorkSummary & {
  bodyText: string | null
  genre: string | null
  mood: string | null
  language: string
  updatedAt: string
  isOwn: boolean
}

export type CreationFailure = {
  ok: false
  error: {
    code: 'invalid' | 'forbidden' | 'not_found' | 'unavailable'
    message: string
    providerCode?: string
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
  bodyText: string
  coverUrl: string | null
  status: PublishStatus
  audience: Audience
  updatedAt: string
  tags: string[]
}

export type DraftListRow = {
  id: string
  type: CreationType
  title: string | null
  status: PublishStatus
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
}

export type PublishedWorksPage = {
  works: PublishedWorkSummary[]
  nextCursor: import('./publishedCursor.ts').PublishedCursor | null
}

export type PublishCreationResult =
  | { ok: true; updatedAt: string; audience: Audience; status: PublishStatus }
  | { ok: false; conflict: true; remoteUpdatedAt: string }
  | CreationFailure
