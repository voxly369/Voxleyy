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
  isOwn: boolean
}

export type CreationFailure = {
  ok: false
  error: { code: 'invalid' | 'forbidden' | 'not_found' | 'unavailable'; message: string }
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
