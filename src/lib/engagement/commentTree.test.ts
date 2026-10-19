import { describe, expect, it } from 'vitest'
import { buildCommentTree, type CommentAuthor, type CommentRow } from './commentTree.ts'

const author = (id: string): CommentAuthor => ({
  id,
  username: `user_${id.slice(0, 4)}`,
  displayName: 'Writer',
  avatarUrl: null,
  verified: false,
})

describe('buildCommentTree', () => {
  it('attaches orphan replies to the root list', () => {
    const rows: CommentRow[] = [
      {
        id: 'root',
        creationId: 'c1',
        authorId: 'a1',
        parentId: null,
        body: 'Root',
        isRemoved: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'orphan',
        creationId: 'c1',
        authorId: 'a2',
        parentId: 'missing',
        body: 'Orphan',
        isRemoved: false,
        createdAt: '2026-01-01T00:01:00Z',
        updatedAt: '2026-01-01T00:01:00Z',
      },
    ]
    const tree = buildCommentTree(rows, new Map([
      ['a1', author('a1')],
      ['a2', author('a2')],
    ]), { viewerIsFounder: false })
    expect(tree).toHaveLength(2)
  })

  it('shows removed copy for the founder view only', () => {
    const rows: CommentRow[] = [
      {
        id: 'r1',
        creationId: 'c1',
        authorId: 'a1',
        parentId: null,
        body: 'Secret',
        isRemoved: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]
    const founders = buildCommentTree(rows, new Map([['a1', author('a1')]]), { viewerIsFounder: true })
    expect(founders[0]?.body).toBe('This comment was removed')
    const readers = buildCommentTree(rows, new Map([['a1', author('a1')]]), { viewerIsFounder: false })
    expect(readers[0]?.body).toBe('')
  })

  it('flattens deep reply nesting to one level', () => {
    const rows: CommentRow[] = [
      {
        id: 'root',
        creationId: 'c1',
        authorId: 'a1',
        parentId: null,
        body: 'Root',
        isRemoved: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'child',
        creationId: 'c1',
        authorId: 'a2',
        parentId: 'root',
        body: 'Child',
        isRemoved: false,
        createdAt: '2026-01-01T00:01:00Z',
        updatedAt: '2026-01-01T00:01:00Z',
      },
      {
        id: 'grand',
        creationId: 'c1',
        authorId: 'a3',
        parentId: 'child',
        body: 'Grand',
        isRemoved: false,
        createdAt: '2026-01-01T00:02:00Z',
        updatedAt: '2026-01-01T00:02:00Z',
      },
    ]
    const tree = buildCommentTree(rows, new Map([
      ['a1', author('a1')],
      ['a2', author('a2')],
      ['a3', author('a3')],
    ]), { viewerIsFounder: false })
    expect(tree[0]?.replies.map((r) => r.id)).toEqual(['child', 'grand'])
    expect(tree[0]?.replies.every((r) => r.replies.length === 0)).toBe(true)
  })

  it('renders unavailable user when author profile is missing', () => {
    const rows: CommentRow[] = [
      {
        id: 'c1',
        creationId: 'w1',
        authorId: 'banned-author',
        parentId: null,
        body: 'Ghost comment',
        isRemoved: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]
    const tree = buildCommentTree(rows, new Map(), { viewerIsFounder: false })
    expect(tree).toHaveLength(1)
    expect(tree[0]?.author.displayName).toBe('Unavailable user')
    expect(tree[0]?.author.username).toBe('')
    expect(tree[0]?.author.unavailable).toBe(true)
  })
})
