export type CommentRow = {
  id: string
  creationId: string
  authorId: string
  parentId: string | null
  body: string
  isRemoved: boolean
  createdAt: string
  updatedAt: string
}

export type CommentAuthor = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
  unavailable?: boolean
}

const UNAVAILABLE_AUTHOR: CommentAuthor = {
  id: '',
  username: '',
  displayName: 'Unavailable user',
  avatarUrl: null,
  verified: false,
  unavailable: true,
}

export type CommentNode = {
  id: string
  author: CommentAuthor
  body: string
  isRemoved: boolean
  createdAt: string
  updatedAt: string
  replies: CommentNode[]
}

const REMOVED_COPY = 'This comment was removed'

export function buildCommentTree(
  rows: CommentRow[],
  authors: Map<string, CommentAuthor>,
  options: { viewerIsFounder: boolean },
): CommentNode[] {
  const byId = new Map<string, CommentNode>()
  for (const row of rows) {
    const author = authors.get(row.authorId) ?? UNAVAILABLE_AUTHOR
    const body = row.isRemoved ? (options.viewerIsFounder ? REMOVED_COPY : '') : row.body
    byId.set(row.id, {
      id: row.id,
      author,
      body,
      isRemoved: row.isRemoved,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      replies: [],
    })
  }

  const roots: CommentNode[] = []
  for (const row of rows) {
    const node = byId.get(row.id)
    if (!node) continue
    if (!row.parentId) {
      roots.push(node)
      continue
    }
    const parent = byId.get(row.parentId)
    if (parent) {
      parent.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  // Flatten deep nesting to one reply level for display.
  for (const root of roots) {
    const flat: CommentNode[] = []
    const walk = (nodes: CommentNode[]) => {
      for (const child of nodes) {
        flat.push({ ...child, replies: [] })
        if (child.replies.length > 0) walk(child.replies)
      }
    }
    walk(root.replies)
    root.replies = flat
  }

  return roots
}
