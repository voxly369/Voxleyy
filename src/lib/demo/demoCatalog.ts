import { SHOW_DEMO_DATA } from '../../config/productFlags.ts'
import type { CreationAuthor } from '../creations/types.ts'
import type { FeedPost } from '../feed/types.ts'

export const DEMO_CONTENT_LABEL = 'Demo content — sample only'

export type DemoWriter = CreationAuthor & { isDemo: true }

function demoWritersPayload(): readonly DemoWriter[] {
  return [
    {
      id: 'd0000000-0000-4000-8000-000000000001',
      username: 'DEMO_WRITER_alex',
      displayName: 'Alex (demo writer)',
      avatarUrl: null,
      verified: false,
      isDemo: true,
    },
    {
      id: 'd0000000-0000-4000-8000-000000000002',
      username: 'DEMO_WRITER_jordan',
      displayName: 'Jordan (demo writer)',
      avatarUrl: null,
      verified: false,
      isDemo: true,
    },
  ]
}

function demoPostsPayload(writers: readonly DemoWriter[]): readonly FeedPost[] {
  const now = '2026-01-15T12:00:00.000Z'
  return [
    {
      id: 'd0000000-0000-4000-8000-000000000101',
      type: 'written_post',
      title: `[Demo] Morning pages`,
      caption: DEMO_CONTENT_LABEL,
      bodyExcerpt: 'A short demo post for local preview.',
      bodyTruncated: false,
      status: 'published',
      audience: 'public',
      coverUrl: null,
      createdAt: now,
      publishedAt: now,
      author: writers[0]!,
      likeCount: 0,
      commentCount: 0,
      saveCount: 0,
      likedByViewer: false,
      savedByViewer: false,
      tags: ['demo'],
      language: 'en',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000102',
      type: 'poem',
      title: `[Demo] Streetlight verse`,
      caption: DEMO_CONTENT_LABEL,
      bodyExcerpt: 'Second demo piece for empty Discover previews.',
      bodyTruncated: false,
      status: 'published',
      audience: 'public',
      coverUrl: null,
      createdAt: now,
      publishedAt: now,
      author: writers[1]!,
      likeCount: 0,
      commentCount: 0,
      saveCount: 0,
      likedByViewer: false,
      savedByViewer: false,
      tags: ['demo'],
      language: 'en',
    },
  ]
}

export function getDemoWriters(): readonly DemoWriter[] {
  if (!SHOW_DEMO_DATA) return []
  return demoWritersPayload()
}

export function getDemoPosts(): readonly FeedPost[] {
  if (!SHOW_DEMO_DATA) return []
  return demoPostsPayload(demoWritersPayload())
}
