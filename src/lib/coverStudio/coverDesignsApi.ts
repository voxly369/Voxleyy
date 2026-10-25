import { z } from 'zod'
import type { Database, Json } from '../database.types.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import {
  type CoverDesignDocument,
  coverDesignDocumentSchema,
  parseCoverDesignJson,
} from './designSchema.ts'

export type CoverDesignRecord = {
  id: string
  userId: string
  bookId: string | null
  name: string
  design: CoverDesignDocument
  thumbnailPath: string | null
  createdAt: string
  updatedAt: string
}

export type CoverDesignApiFailure = {
  ok: false
  error: { code: 'forbidden' | 'not_found' | 'invalid' | 'unavailable' | 'limit'; message: string; providerCode?: string }
}

export type CoverDesignApiResult<T> = { ok: true; data: T } | CoverDesignApiFailure

const nameSchema = z.string().trim().min(1).max(80)

function fail(code: CoverDesignApiFailure['error']['code'], message: string, error?: { code?: string }): CoverDesignApiFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function parseRow(row: Record<string, unknown>): CoverDesignRecord | null {
  const design = parseCoverDesignJson(row.design_json)
  if (!design) return null
  const id = typeof row.id === 'string' ? row.id : null
  const userId = typeof row.user_id === 'string' ? row.user_id : null
  const name = typeof row.name === 'string' ? row.name : null
  if (!id || !userId || !name) return null
  return {
    id,
    userId,
    bookId: typeof row.book_id === 'string' ? row.book_id : null,
    name,
    design,
    thumbnailPath: typeof row.thumbnail_path === 'string' ? row.thumbnail_path : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  }
}

export async function listCoverDesigns(): Promise<CoverDesignApiResult<CoverDesignRecord[]>> {
  const { data, error } = await supabase
    .from('cover_designs')
    .select('id, user_id, book_id, name, design_json, thumbnail_path, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) return fail('unavailable', 'We could not load your cover designs.', error)
  const rows = (data ?? []) as Record<string, unknown>[]
  const parsed = rows.map(parseRow).filter((r): r is CoverDesignRecord => r !== null)
  return { ok: true, data: parsed }
}

export async function fetchCoverDesign(id: string): Promise<CoverDesignApiResult<CoverDesignRecord>> {
  const { data, error } = await supabase
    .from('cover_designs')
    .select('id, user_id, book_id, name, design_json, thumbnail_path, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return fail('unavailable', 'We could not load this cover design.', error)
  if (!data) return fail('not_found', 'This cover design was not found.')
  const parsed = parseRow(data as Record<string, unknown>)
  if (!parsed) return fail('invalid', 'This cover design could not be read.')
  return { ok: true, data: parsed }
}

export async function listCoverDesignsForBook(bookId: string): Promise<CoverDesignApiResult<CoverDesignRecord[]>> {
  const { data, error } = await supabase
    .from('cover_designs')
    .select('id, user_id, book_id, name, design_json, thumbnail_path, created_at, updated_at')
    .eq('book_id', bookId)
    .order('updated_at', { ascending: false })
  if (error) return fail('unavailable', 'We could not load cover designs for this book.', error)
  const parsed = ((data ?? []) as Record<string, unknown>[]).map(parseRow).filter((r): r is CoverDesignRecord => r !== null)
  return { ok: true, data: parsed }
}

export type CreateCoverDesignInput = {
  name: string
  design: CoverDesignDocument
  bookId?: string | null
  thumbnailPath?: string | null
}

export async function createCoverDesign(input: CreateCoverDesignInput): Promise<CoverDesignApiResult<CoverDesignRecord>> {
  const name = nameSchema.safeParse(input.name)
  if (!name.success) return fail('invalid', 'Enter a name between 1 and 80 characters.')
  const designParsed = coverDesignDocumentSchema.safeParse(input.design)
  if (!designParsed.success) return fail('invalid', 'This cover design is not valid.')

  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return fail('forbidden', 'Sign in to save cover designs.')

  const { data, error } = await supabase
    .from('cover_designs')
    .insert({
      user_id: userId,
      book_id: input.bookId ?? null,
      name: name.data,
      design_json: designParsed.data as unknown as Json,
      thumbnail_path: input.thumbnailPath ?? null,
    })
    .select('id, user_id, book_id, name, design_json, thumbnail_path, created_at, updated_at')
    .single()

  if (error) {
    if (error.message.includes('50 cover designs')) return fail('limit', error.message)
    return fail('unavailable', 'We could not save this cover design.', error)
  }
  const parsed = parseRow(data as Record<string, unknown>)
  if (!parsed) return fail('invalid', 'Saved cover design could not be read.')
  return { ok: true, data: parsed }
}

export type UpdateCoverDesignInput = {
  name?: string
  design?: CoverDesignDocument
  bookId?: string | null
  thumbnailPath?: string | null
}

export async function updateCoverDesign(
  id: string,
  input: UpdateCoverDesignInput,
): Promise<CoverDesignApiResult<CoverDesignRecord>> {
  const payload: Database['public']['Tables']['cover_designs']['Update'] = {}
  if (input.name !== undefined) {
    const name = nameSchema.safeParse(input.name)
    if (!name.success) return fail('invalid', 'Enter a name between 1 and 80 characters.')
    payload.name = name.data
  }
  if (input.design !== undefined) {
    const designParsed = coverDesignDocumentSchema.safeParse(input.design)
    if (!designParsed.success) return fail('invalid', 'This cover design is not valid.')
    payload.design_json = designParsed.data as unknown as Json
  }
  if (input.bookId !== undefined) payload.book_id = input.bookId
  if (input.thumbnailPath !== undefined) payload.thumbnail_path = input.thumbnailPath
  if (Object.keys(payload).length === 0) return fail('invalid', 'Nothing to update.')

  const { data, error } = await supabase
    .from('cover_designs')
    .update(payload)
    .eq('id', id)
    .select('id, user_id, book_id, name, design_json, thumbnail_path, created_at, updated_at')
    .maybeSingle()

  if (error) return fail('unavailable', 'We could not update this cover design.', error)
  if (!data) return fail('not_found', 'This cover design was not found.')
  const parsed = parseRow(data as Record<string, unknown>)
  if (!parsed) return fail('invalid', 'Updated cover design could not be read.')
  return { ok: true, data: parsed }
}

export async function deleteCoverDesign(id: string): Promise<CoverDesignApiResult<true>> {
  const { error, count } = await supabase.from('cover_designs').delete({ count: 'exact' }).eq('id', id)
  if (error) return fail('unavailable', 'We could not delete this cover design.', error)
  if (!count) return fail('not_found', 'This cover design was not found.')
  return { ok: true, data: true }
}

export type CoverDesignAutosaveOptions = {
  debounceMs?: number
  onStatus?: (status: 'idle' | 'pending' | 'saving' | 'saved' | 'error', detail?: string) => void
}

/** Debounced autosave helper for an existing cover_designs row. */
export function createCoverDesignAutosave(
  designId: string,
  options: CoverDesignAutosaveOptions = {},
): {
  schedule: (patch: UpdateCoverDesignInput) => void
  flush: () => Promise<CoverDesignApiResult<CoverDesignRecord> | null>
  cancel: () => void
} {
  const debounceMs = options.debounceMs ?? 1200
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: UpdateCoverDesignInput | null = null
  let inflight: Promise<CoverDesignApiResult<CoverDesignRecord>> | null = null

  function mergePatch(next: UpdateCoverDesignInput) {
    pending = { ...pending, ...next, design: next.design ?? pending?.design, name: next.name ?? pending?.name }
  }

  async function runSave(): Promise<CoverDesignApiResult<CoverDesignRecord> | null> {
    if (!pending) return null
    const patch = pending
    pending = null
    options.onStatus?.('saving')
    inflight = updateCoverDesign(designId, patch)
    const result = await inflight
    inflight = null
    if (result.ok) options.onStatus?.('saved')
    else options.onStatus?.('error', result.error.message)
    if (pending) void runSave()
    return result
  }

  return {
    schedule(patch: UpdateCoverDesignInput) {
      mergePatch(patch)
      options.onStatus?.('pending')
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void runSave()
      }, debounceMs)
    },
    async flush() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (inflight) return inflight
      return runSave()
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
      pending = null
      options.onStatus?.('idle')
    },
  }
}
