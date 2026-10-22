import { describe, expect, it } from 'vitest'
import { worksForPostsGrid } from './profilePostsMapper.ts'

describe('worksForPostsGrid', () => {
  it('never includes non-public work even when the server returned it', () => {
    const works = worksForPostsGrid([
      {
        id: '1',
        type: 'poem',
        title: 'Public',
        coverUrl: null,
        publishedAt: '2026-01-01T00:00:00.000Z',
        audience: 'public',
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
        bodyText: 'Hi',
        bodyJson: null,
      },
      {
        id: '2',
        type: 'poem',
        title: 'Private',
        coverUrl: null,
        publishedAt: '2026-01-01T00:00:00.000Z',
        audience: 'private',
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
        bodyText: 'Secret',
        bodyJson: null,
      },
    ])
    expect(works.map((w) => w.id)).toEqual(['1'])
  })
})
