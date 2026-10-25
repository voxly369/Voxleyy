const READER_ID = '11111111-1111-1111-1111-111111111111'

type CoverDesignRow = {
  id: string
  user_id: string
  book_id: string | null
  name: string
  design_json: Record<string, unknown>
  thumbnail_path: string | null
  created_at: string
  updated_at: string
}

const designs = new Map<string, CoverDesignRow>()

const emptyDesign = {
  version: 1,
  width: 1600,
  height: 2400,
  background: { type: 'solid', color: '#3d2c24' },
  layers: [],
}

export function resetCoverStudioMocks() {
  designs.clear()
}

function parseBody(postData: unknown): Partial<CoverDesignRow> {
  if (!postData) return {}
  if (typeof postData === 'string') return JSON.parse(postData) as Partial<CoverDesignRow>
  return postData as Partial<CoverDesignRow>
}

export function coverStudioMockHandleRest(url: string, method: string, postData?: unknown): unknown {
  if (!url.includes('/rest/v1/cover_designs')) return undefined

  if (method === 'GET') {
    const bookEq = url.match(/book_id=eq\.([^&]+)/)
    const idEq = url.match(/[?&]id=eq\.([^&]+)/)
    if (idEq?.[1]) {
      const row = designs.get(idEq[1])
      return row ? [row] : []
    }
    const rows = [...designs.values()].filter((d) => d.user_id === READER_ID)
    if (bookEq?.[1]) return rows.filter((d) => d.book_id === bookEq[1])
    return rows
  }

  if (method === 'POST' && postData) {
    const body = parseBody(postData)
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row: CoverDesignRow = {
      id,
      user_id: READER_ID,
      book_id: (body.book_id as string | null) ?? null,
      name: String(body.name ?? 'Untitled'),
      design_json: (body.design_json as Record<string, unknown>) ?? emptyDesign,
      thumbnail_path: null,
      created_at: now,
      updated_at: now,
    }
    designs.set(id, row)
    return [row]
  }

  if (method === 'PATCH' && postData) {
    const idEq = url.match(/id=eq\.([^&]+)/)
    const id = idEq?.[1]
    if (!id) return []
    const existing = designs.get(id)
    if (!existing) return []
    const body = parseBody(postData)
    const next = {
      ...existing,
      ...body,
      design_json: (body.design_json as Record<string, unknown>) ?? existing.design_json,
      updated_at: new Date().toISOString(),
    }
    designs.set(id, next)
    return [next]
  }

  if (method === 'DELETE') {
    const idEq = url.match(/id=eq\.([^&]+)/)
    const id = idEq?.[1]
    if (id) designs.delete(id)
    return []
  }

  return undefined
}
