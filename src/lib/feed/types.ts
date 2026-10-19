import type { WorkSummary } from '../creations/types.ts'

export type FeedPost = WorkSummary & {
  publishedAt: string
  bodyExcerpt: string | null
  bodyTruncated: boolean
  likeCount: number
  commentCount: number
  saveCount: number
  likedByViewer: boolean
  savedByViewer: boolean
  tags: string[]
}

export type FeedPage = {
  posts: FeedPost[]
  nextCursor: import('./cursor.ts').FeedCursor | null
}

export type FeedKind = 'home' | 'following'
