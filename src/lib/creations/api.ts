import type { Json } from '../database.types.ts'
import { supabase } from '../supabaseClient.ts'
import { messageForCreationDeleteError, messageForCreationWriteError } from './errors.ts'
import type {
  CreationAuthor,
  CreationDetail,
  CreationFailure,
  CreationResult,
  DraftInput,
  WorkSummary,
} from './types.ts'
import { validateCreationFields } from './validation.ts'

const AUTHOR_EMBED = `author:profiles_public!creations_author_id_fkey(id, username, display_name, avatar_url, verified)`

const WORK_LIST_COLUMNS =
  `id, type, title, caption, status, audience, cover_url, created_at, author_id, ${AUTHOR_EMBED}` as const

const DETAIL_COLUMNS =
  `id, type, title, caption, body_text, status, audience, cover_url, genre, mood, language, created_at, author_id, ${AUTHOR_EMBED}` as const

function fail(code: CreationFailure['error']['code'], message: string): CreationFailure {
  return { ok: false, error: { code, message } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function parseAuthor(value: unknown): CreationAuthor | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = text(row.id)
  const username = text(row.username)
  if (!id || !username) return null
  return {
    id,
    username,
    displayName: text(row.display_name) ?? '',
    avatarUrl: text(row.avatar_url),
    verified: row.verified === true,
  }
}

function parseWork(row: Record<string, unknown>): WorkSummary | null {
  const id = text(row.id)
  const type = row.type
  const status = row.status
  const audience = row.audience
  const createdAt = text(row.created_at)
  const author = parseAuthor(row.author)
  if (!id || !author || !createdAt) return null
  if (typeof type !== 'string' || typeof status !== 'string' || typeof audience !== 'string') return null
  return {
    id,
    type: type as WorkSummary['type'],
    title: text(row.title),
    caption: text(row.caption),
    status: status as WorkSummary['status'],
    audience: audience as WorkSummary['audience'],
    coverUrl: text(row.cover_url),
    createdAt,
    author,
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

async function syncTags(creationId: string, tags: string[]): Promise<CreationFailure | null> {
  const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]
  const issue = validateCreationFields({ tags: normalized })
  if (issue) return fail('invalid', issue.message)

  const { data: existing, error: readError } = await supabase
    .from('creation_tags')
    .select('tag')
    .eq('creation_id', creationId)
  if (readError) return fail('unavailable', messageForCreationWriteError(readError))

  const have = new Set((existing ?? []).map((row) => row.tag))
  const want = new Set(normalized)
  const toRemove = [...have].filter((tag) => !want.has(tag))
  const toAdd = [...want].filter((tag) => !have.has(tag))

  if (toRemove.length > 0) {
    const { error } = await supabase.from('creation_tags').delete().eq('creation_id', creationId).in('tag', toRemove)
    if (error) return fail('unavailable', messageForCreationWriteError(error))
  }
  for (const tag of toAdd) {
    const { error } = await supabase.from('creation_tags').insert({ creation_id: creationId, tag })
    if (error) return fail('unavailable', messageForCreationWriteError(error))
  }
  return null
}

export async function createDraft(input: DraftInput): Promise<CreationResult<CreationDetail>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to save a draft.')

  const issue = validateCreationFields(input)
  if (issue) return fail('invalid', issue.message)

  const { tags, ...fields } = input
  const { data, error } = await supabase
    .from('creations')
    .insert({
      author_id: userId,
      type: fields.type,
      title: fields.title ?? null,
      caption: fields.caption ?? null,
      body_text: fields.body_text ?? null,
      body_json: (fields.body_json ?? null) as Json | null,
      genre: fields.genre ?? null,
      mood: fields.mood ?? null,
      language: fields.language ?? 'en',
      audience: fields.audience ?? 'private',
      status: 'draft',
      media_url: null,
    })
    .select(DETAIL_COLUMNS)
    .single()

  if (error || !data) return fail('unavailable', messageForCreationWriteError(error))

  if (tags && tags.length > 0) {
    const tagError = await syncTags(data.id, tags)
    if (tagError) return tagError
  }

  const work = parseWork(data as Record<string, unknown>)
  if (!work) return fail('unavailable', 'We could not save this draft. Try again.')
  return {
    ok: true,
    data: {
      ...work,
      bodyText: text((data as Record<string, unknown>).body_text),
      genre: text((data as Record<string, unknown>).genre),
      mood: text((data as Record<string, unknown>).mood),
      language: text((data as Record<string, unknown>).language) ?? 'en',
      isOwn: true,
    },
  }
}

export async function listWorksForAuthor(authorId: string): Promise<CreationResult<WorkSummary[]>> {
  const { data, error } = await supabase
    .from('creations')
    .select(WORK_LIST_COLUMNS)
    .eq('author_id', authorId)
    .eq('is_removed', false)
    .in('status', ['draft', 'published'])
    .order('created_at', { ascending: false })

  if (error) return fail('unavailable', 'We could not load works. Try again.')
  const works = (data ?? []).flatMap((row) => {
    const parsed = parseWork(row as Record<string, unknown>)
    return parsed ? [parsed] : []
  })
  return { ok: true, data: works }
}

export async function getCreationById(id: string): Promise<CreationResult<CreationDetail>> {
  const userId = await currentUserId()
  const { data, error } = await supabase.from('creations').select(DETAIL_COLUMNS).eq('id', id).maybeSingle()
  if (error) return fail('unavailable', 'We could not load this work. Try again.')
  if (!data) return fail('not_found', 'This work is not available.')

  const work = parseWork(data as Record<string, unknown>)
  if (!work) return fail('not_found', 'This work is not available.')
  return {
    ok: true,
    data: {
      ...work,
      bodyText: text((data as Record<string, unknown>).body_text),
      genre: text((data as Record<string, unknown>).genre),
      mood: text((data as Record<string, unknown>).mood),
      language: text((data as Record<string, unknown>).language) ?? 'en',
      isOwn: Boolean(userId && userId === work.author.id),
    },
  }
}

export async function unpublishCreation(id: string): Promise<CreationResult<true>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to change this work.')

  const { error } = await supabase
    .from('creations')
    .update({ status: 'draft' })
    .eq('id', id)
    .eq('author_id', userId)

  if (error) return fail('unavailable', messageForCreationWriteError(error))
  return { ok: true, data: true }
}

export async function deleteCreation(id: string): Promise<CreationResult<true>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to delete this work.')

  const { data, error } = await supabase.from('creations').delete().eq('id', id).eq('author_id', userId).select('id')
  if (error) return fail('unavailable', messageForCreationDeleteError(error))
  if (!data || data.length === 0) return fail('forbidden', messageForCreationDeleteError(null))
  return { ok: true, data: true }
}

export async function updateDraft(id: string, input: DraftInput): Promise<CreationResult<CreationDetail>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to save this draft.')

  const issue = validateCreationFields(input)
  if (issue) return fail('invalid', issue.message)

  const { tags, type: _type, ...fields } = input
  const { error: updateError } = await supabase
    .from('creations')
    .update({
      media_url: null,
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.caption !== undefined ? { caption: fields.caption } : {}),
      ...(fields.body_text !== undefined ? { body_text: fields.body_text } : {}),
      ...(fields.body_json !== undefined ? { body_json: fields.body_json as Json } : {}),
      ...(fields.genre !== undefined ? { genre: fields.genre } : {}),
      ...(fields.mood !== undefined ? { mood: fields.mood } : {}),
      ...(fields.language !== undefined ? { language: fields.language } : {}),
      ...(fields.audience !== undefined ? { audience: fields.audience } : {}),
    })
    .eq('id', id)
    .eq('author_id', userId)
  if (updateError) return fail('unavailable', messageForCreationWriteError(updateError))

  if (tags) {
    const tagError = await syncTags(id, tags)
    if (tagError) return tagError
  }

  return getCreationById(id)
}

/** Author fields for cards; never reads profiles.city. */
export const CREATION_AUTHOR_PUBLIC_COLUMNS = 'id, username, display_name, avatar_url, verified' as const
