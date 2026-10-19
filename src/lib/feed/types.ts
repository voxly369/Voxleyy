import type { WorkSummary } from '../creations/types.ts'

export type FeedPost = WorkSummary & {
  publishedAt: string
  bodyText: string | null
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
