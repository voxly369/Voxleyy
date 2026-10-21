import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PostCard } from './PostCard.tsx'
import type { FeedPost } from '../../lib/feed/types.ts'

vi.mock('../../lib/engagement/toggleLike.ts', () => ({
  toggleLike: vi.fn(),
}))

const PROSE_EXCERPT = [
  'Its is a stubborn thing. It sits in the chest like a stone.',
  'It will not move for pleading, will not soften for time.',
  '',
  'Second paragraph opens with rain on glass.',
].join('\n\n')

function poemPost(bodyExcerpt: string): FeedPost {
  return {
    id: 'p1',
    type: 'poem',
    title: 'Stubborn',
    caption: null,
    status: 'published',
    audience: 'public',
    coverUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    publishedAt: '2026-01-01T00:00:00Z',
    author: {
      id: 'a1',
      username: 'poet',
      displayName: 'Poet',
      avatarUrl: null,
      verified: false,
    },
    bodyExcerpt,
    bodyTruncated: false,
    likeCount: 1,
    commentCount: 0,
    saveCount: 0,
    likedByViewer: false,
    savedByViewer: false,
    tags: [],
  }
}

describe('PostCard literary preview', () => {
  it('uses a single stanza for prose-style poem excerpt', () => {
    const { container } = render(
      <MemoryRouter>
        <PostCard post={poemPost(PROSE_EXCERPT)} onCommentClick={() => {}} onPostUpdate={() => {}} />
      </MemoryRouter>,
    )
    const stanzaGroups = container.querySelectorAll('.flex.flex-col.gap-0')
    expect(stanzaGroups.length).toBe(1)
    expect(screen.getByText(/stubborn thing/i)).toBeInTheDocument()
  })

  it('shows Read more directly under excerpt when truncated', () => {
    render(
      <MemoryRouter>
        <PostCard
          post={{ ...poemPost('Line\n'.repeat(20)), bodyTruncated: true }}
          onCommentClick={() => {}}
          onPostUpdate={() => {}}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Read more')).toBeInTheDocument()
  })
})
