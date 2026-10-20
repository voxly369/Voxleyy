const READER = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'readerone',
  display_name: 'Reader One',
}

const DRAFT_ID = '00000000-0000-0000-0000-0000000000d1'

export type Audience = 'public' | 'unlisted' | 'private'

type StoredCreation = {
  id: string
  type: string
  title: string | null
  body_text: string
  status: 'draft' | 'published'
  audience: Audience
  author_id: string
  updated_at: string
  published_at: string | null
}

export let lastPublishPatch: { status?: string; audience?: string } | null = null

let active = false
const store = new Map<string, StoredCreation>()

function feedEntry(row: StoredCreation) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    caption: null,
    body_excerpt: row.body_text,
    body_truncated: false,
    cover_url: null,
    audience: row.audience,
    published_at: row.published_at,
    created_at: row.published_at ?? row.updated_at,
    like_count: 0,
    comment_count: 0,
    save_count: 0,
    author_id: row.author_id,
    author: {
      id: READER.id,
      username: READER.username,
      display_name: READER.display_name,
      avatar_url: null,
      verified: false,
    },
  }
}

function syncFromPatch(id: string, patch: { status?: string; audience?: Audience }) {
  const existing = store.get(id) ?? {
    id,
    type: 'poem',
    title: 'Draft title',
    body_text: 'Draft body',
    status: 'draft' as const,
    audience: 'private' as Audience,
    author_id: READER.id,
    updated_at: '2026-02-01T00:00:00.000Z',
    published_at: null,
  }
  const updated: StoredCreation = {
    ...existing,
    status: (patch.status as StoredCreation['status']) ?? existing.status,
    audience: patch.audience ?? existing.audience,
    updated_at: new Date().toISOString(),
    published_at: patch.status === 'published' ? new Date().toISOString() : existing.published_at,
  }
  store.set(id, updated)
}

export function resetPublishAudienceState() {
  active = false
  lastPublishPatch = null
  store.clear()
}

export function enablePublishAudienceMocks() {
  active = true
  lastPublishPatch = null
  store.clear()
}

export function seedPublishedVariantsForViewer() {
  active = true
  store.clear()
  const now = new Date().toISOString()
  const base = {
    type: 'poem',
    body_text: 'Body',
    author_id: READER.id,
  }
  store.set('pub-1', {
    ...base,
    id: 'pub-1',
    title: 'Public poem',
    status: 'published',
    audience: 'public',
    updated_at: now,
    published_at: now,
  })
  store.set('unl-1', {
    ...base,
    id: 'unl-1',
    title: 'Unlisted poem',
    status: 'published',
    audience: 'unlisted',
    updated_at: now,
    published_at: now,
  })
  store.set('priv-1', {
    ...base,
    id: 'priv-1',
    title: 'Private poem',
    status: 'published',
    audience: 'private',
    updated_at: now,
    published_at: now,
  })
}

/** Returns undefined to fall through to default fixture data. */
export function audienceMockHandleRest(
  url: string,
  method: string,
  postData: unknown,
): unknown[] | undefined {
  if (!active) return undefined

  if (url.includes('/rest/v1/creations') && method === 'PATCH') {
    const patch = (postData ?? {}) as { status?: string; audience?: Audience }
    lastPublishPatch = patch
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const id = idMatch?.[1] ?? DRAFT_ID
    syncFromPatch(id, patch)
    const updated = store.get(id)!
    return [{ updated_at: updated.updated_at, audience: updated.audience, status: updated.status }]
  }

  if (url.includes('/rest/v1/feed_creations') || url.includes('/rest/v1/following_feed')) {
    const publicRows = [...store.values()].filter(
      (row) => row.status === 'published' && row.audience === 'public' && row.published_at,
    )
    if (publicRows.length > 0) return publicRows.map(feedEntry)
    return undefined
  }

  if (url.includes('/rest/v1/creations') && method === 'GET' && store.size > 0) {
    const idMatch = url.match(/id=eq\.([^&]+)/)
    if (idMatch?.[1] && store.has(idMatch[1])) {
      const row = store.get(idMatch[1])!
      return [
        {
          id: row.id,
          type: row.type,
          title: row.title,
          caption: '',
          body_text: row.body_text,
          body_json: {
            version: 1,
            format: 'rich',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: row.body_text }] }],
          },
          cover_url: null,
          status: row.status,
          audience: row.audience,
          author_id: row.author_id,
          genre: null,
          mood: null,
          language: 'en',
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: row.updated_at,
          author: {
            id: READER.id,
            username: READER.username,
            display_name: READER.display_name,
            avatar_url: null,
            verified: false,
          },
        },
      ]
    }
    if (url.includes(`author_id=eq.${READER.id}`) && url.includes('status=eq.published')) {
      const rows = [...store.values()].filter(
        (row) =>
          row.status === 'published' &&
          row.published_at &&
          (url.includes('audience=eq.public') ? row.audience === 'public' : true),
      )
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        cover_url: null,
        published_at: row.published_at,
        audience: row.audience,
        like_count: 0,
        comment_count: 0,
        body_text: row.body_text,
        body_json: null,
      }))
    }
    if (url.includes('select=id%2Ctype%2Ctitle%2Cstatus%2Caudience')) {
      return [...store.values()].map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        status: row.status,
        audience: row.audience,
        updated_at: row.updated_at,
        is_removed: false,
      }))
    }
  }

  return undefined
}
