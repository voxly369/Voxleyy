import type { UserRole } from '../auth/profile.ts'
import type { Json } from '../database.types.ts'
import { supabase } from '../supabaseClient.ts'
import {
  messageForCreationDeleteError,
  messageForCreationWriteError,
  messageForPublishError,
  TAG_SYNC_WARNING,
} from './errors.ts'
import { bodyTextFromJson } from './bodyDocument.ts'
import { draftsCursorFilter, DRAFTS_PAGE_SIZE, isDraftsCursor, nextDraftsCursor } from './draftsCursor.ts'
import { classifyPublishZeroRowUpdate } from './publishFailure.ts'
import { fieldsForPublish, fieldsForSaveCreation } from './publishPayload.ts'
import { shouldLimitProfileWorksToPublic } from './publishedWorksFilter.ts'
import {
  isPublishedCursor,
  nextPublishedCursor,
  PUBLISHED_PAGE_SIZE,
  publishedCursorFilter,
} from './publishedCursor.ts'
import type {
  Audience,
  CreateDraftResult,
  CreationAuthor,
  CreationDetail,
  CreationFailure,
  CreationResult,
  DraftInput,
  DraftListPage,
  DraftListRow,
  EditableCreation,
  PublishedWorksPage,
  PublishCreationResult,
  SaveCreationResult,
  WorkSummary,
} from './types.ts'
import { providerFields } from '../supabaseFailure.ts'
import { validateCreationFields } from './validation.ts'

const AUTHOR_EMBED = `author:profiles_public!creations_author_id_fkey(id, username, display_name, avatar_url, verified)`

const WORK_LIST_COLUMNS =
  `id, type, title, caption, status, audience, cover_url, created_at, author_id, ${AUTHOR_EMBED}` as const

const DETAIL_COLUMNS =
  `id, type, title, caption, body_text, body_json, status, audience, cover_url, genre, mood, language, created_at, updated_at, author_id, ${AUTHOR_EMBED}` as const

const EDIT_COLUMNS =
  'id, type, title, caption, body_text, body_json, cover_url, mood, status, audience, updated_at, is_removed, author_id' as const

function fail(
  code: CreationFailure['error']['code'],
  message: string,
  error?: { code?: string; status?: number },
): CreationFailure {
  return {
    ok: false,
    error: { code, message, ...providerFields(error ?? (message ? {} : undefined)) },
  }
}

function failFromProvider(
  code: CreationFailure['error']['code'],
  message: string,
  error: { code?: string; message?: string; status?: number } | null,
): CreationFailure {
  return fail(code, message, error ?? undefined)
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
  if (readError) return failFromProvider('unavailable', messageForCreationWriteError(readError), readError)

  const have = new Set((existing ?? []).map((row) => row.tag))
  const want = new Set(normalized)
  const toRemove = [...have].filter((tag) => !want.has(tag))
  const toAdd = [...want].filter((tag) => !have.has(tag))

  if (toRemove.length > 0) {
    const { error } = await supabase.from('creation_tags').delete().eq('creation_id', creationId).in('tag', toRemove)
    if (error) return failFromProvider('unavailable', messageForCreationWriteError(error), error)
  }
  for (const tag of toAdd) {
    const { error } = await supabase.from('creation_tags').insert({ creation_id: creationId, tag })
    if (error) return failFromProvider('unavailable', messageForCreationWriteError(error), error)
  }
  return null
}

export async function createDraft(input: DraftInput): Promise<CreateDraftResult> {
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

  if (error || !data) return failFromProvider('unavailable', messageForCreationWriteError(error), error)

  let tagWarning: CreationFailure | null = null
  if (tags && tags.length > 0) {
    tagWarning = await syncTags(data.id, tags)
  }

  const work = parseWork(data as Record<string, unknown>)
  if (!work) return fail('unavailable', 'We could not save this draft. Try again.')
  return {
    ok: true,
    data: {
      ...work,
      bodyText: text((data as Record<string, unknown>).body_text),
      bodyJson: ((data as Record<string, unknown>).body_json ?? null) as Json | null,
      genre: text((data as Record<string, unknown>).genre),
      mood: text((data as Record<string, unknown>).mood),
      language: text((data as Record<string, unknown>).language) ?? 'en',
      updatedAt: text((data as Record<string, unknown>).updated_at) ?? new Date().toISOString(),
      isOwn: true,
    },
    ...(tagWarning ? { tagError: { message: TAG_SYNC_WARNING } } : {}),
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

  if (error) return failFromProvider('unavailable', 'We could not load works. Try again.', error)
  const works = (data ?? []).flatMap((row) => {
    const parsed = parseWork(row as Record<string, unknown>)
    return parsed ? [parsed] : []
  })
  return { ok: true, data: works }
}

export async function getCreationById(id: string): Promise<CreationResult<CreationDetail>> {
  const userId = await currentUserId()
  const { data, error } = await supabase.from('creations').select(DETAIL_COLUMNS).eq('id', id).maybeSingle()
  if (error) return failFromProvider('unavailable', 'We could not load this work. Try again.', error)
  if (!data) return fail('not_found', 'This work is not available.')

  const work = parseWork(data as Record<string, unknown>)
  if (!work) return fail('not_found', 'This work is not available.')
  return {
    ok: true,
    data: {
      ...work,
      bodyText: text((data as Record<string, unknown>).body_text),
      bodyJson: ((data as Record<string, unknown>).body_json ?? null) as Json | null,
      genre: text((data as Record<string, unknown>).genre),
      mood: text((data as Record<string, unknown>).mood),
      language: text((data as Record<string, unknown>).language) ?? 'en',
      updatedAt: text((data as Record<string, unknown>).updated_at) ?? new Date().toISOString(),
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

  if (error) return failFromProvider('unavailable', messageForCreationWriteError(error), error)
  return { ok: true, data: true }
}

export async function deleteCreation(id: string): Promise<CreationResult<true>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to delete this work.')

  const { data, error } = await supabase.from('creations').delete().eq('id', id).eq('author_id', userId).select('id')
  if (error) return failFromProvider('unavailable', messageForCreationDeleteError(error), error)
  if (!data || data.length === 0) return fail('forbidden', messageForCreationDeleteError(null))
  return { ok: true, data: true }
}

export async function updateDraft(id: string, input: DraftInput): Promise<CreationResult<CreationDetail>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to save this draft.')

  const issue = validateCreationFields(input)
  if (issue) return fail('invalid', issue.message)

  const { tags, type: _type, ...fields } = input
  const patch: import('../database.types.ts').Database['public']['Tables']['creations']['Update'] = {}
  if (fields.title !== undefined) patch.title = fields.title
  if (fields.caption !== undefined) patch.caption = fields.caption
  if (fields.body_text !== undefined) patch.body_text = fields.body_text
  if (fields.body_json !== undefined) patch.body_json = fields.body_json as Json
  if (fields.genre !== undefined) patch.genre = fields.genre
  if (fields.mood !== undefined) patch.mood = fields.mood
  if (fields.language !== undefined) patch.language = fields.language
  if (fields.audience !== undefined) patch.audience = fields.audience
  const { error: updateError } = await supabase
    .from('creations')
    .update(patch)
    .eq('id', id)
    .eq('author_id', userId)
  if (updateError) return failFromProvider('unavailable', messageForCreationWriteError(updateError), updateError)

  if (tags) {
    const tagError = await syncTags(id, tags)
    if (tagError) return tagError
  }

  return getCreationById(id)
}

async function loadTags(creationId: string): Promise<CreationResult<string[]>> {
  const { data, error } = await supabase.from('creation_tags').select('tag').eq('creation_id', creationId)
  if (error) return failFromProvider('unavailable', messageForCreationWriteError(error), error)
  return { ok: true, data: (data ?? []).map((row) => row.tag) }
}

export async function getEditableCreation(id: string): Promise<CreationResult<EditableCreation>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to edit this draft.')

  const { data, error } = await supabase
    .from('creations')
    .select(EDIT_COLUMNS)
    .eq('id', id)
    .eq('author_id', userId)
    .maybeSingle()
  if (error) return failFromProvider('unavailable', 'We could not load this draft. Try again.', error)
  if (!data) return fail('not_found', 'This draft is not available.')

  const tags = await loadTags(id)
  if (!tags.ok) return tags

  const bodyFromJson = bodyTextFromJson(data.body_json)
  const bodyText = data.body_text ?? bodyFromJson

  return {
    ok: true,
    data: {
      id: data.id,
      type: data.type,
      title: data.title ?? '',
      caption: data.caption ?? '',
      bodyText,
      coverUrl: data.cover_url,
      mood: data.mood ?? null,
      status: data.status,
      audience: data.audience,
      updatedAt: data.updated_at,
      tags: tags.data,
      bodyJson: data.body_json,
    },
  }
}

export async function saveCreationFields(input: {
  id: string
  expectedUpdatedAt: string | null
  title: string
  caption: string
  bodyText: string
  bodyJson: Json
  audience: Audience
  tags: string[]
  mood?: string | null
  forceOverwrite?: boolean
}): Promise<SaveCreationResult> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to save this draft.')

  const issue = validateCreationFields({
    body_text: input.bodyText,
    body_json: input.bodyJson,
    tags: input.tags,
    title: input.title,
    caption: input.caption,
    mood: input.mood,
  })
  if (issue) return fail('invalid', issue.message)

  let query = supabase
    .from('creations')
    .update(
      fieldsForSaveCreation({
        title: input.title,
        bodyText: input.bodyText,
        bodyJson: input.bodyJson,
        caption: input.caption,
        audience: input.audience,
        mood: input.mood,
      }),
    )
    .eq('id', input.id)
    .eq('author_id', userId)

  if (!input.forceOverwrite && input.expectedUpdatedAt) {
    query = query.eq('updated_at', input.expectedUpdatedAt)
  }

  const { data, error } = await query.select('updated_at').maybeSingle()
  if (error) return failFromProvider('unavailable', messageForCreationWriteError(error), error)
  if (!data) {
    const remote = await supabase.from('creations').select('updated_at').eq('id', input.id).maybeSingle()
    return {
      ok: false,
      conflict: true,
      remoteUpdatedAt: remote.data?.updated_at ?? input.expectedUpdatedAt ?? '',
    }
  }

  const tagError = await syncTags(input.id, input.tags)
  if (tagError) {
    return { ok: true, updatedAt: data.updated_at, tagError: { message: TAG_SYNC_WARNING } }
  }

  return { ok: true, updatedAt: data.updated_at }
}

export async function fetchProfileRole(userId: string): Promise<CreationResult<UserRole>> {
  const { data, error } = await supabase.from('profiles_public').select('role').eq('id', userId).maybeSingle()
  if (error) return failFromProvider('unavailable', 'We could not load your profile. Try again.', error)
  if (!data?.role) return fail('not_found', 'Profile not found.')
  const role = data.role
  if (role !== 'reader' && role !== 'writer' && role !== 'founder') return fail('unavailable', 'We could not load your profile. Try again.')
  return { ok: true, data: role }
}

export async function publishCreation(input: {
  id: string
  audience: Audience
  expectedUpdatedAt: string | null
  forceOverwrite?: boolean
}): Promise<PublishCreationResult> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to publish this work.')

  let query = supabase
    .from('creations')
    .update(fieldsForPublish(input.audience))
    .eq('id', input.id)
    .eq('author_id', userId)

  if (!input.forceOverwrite && input.expectedUpdatedAt) {
    query = query.eq('updated_at', input.expectedUpdatedAt)
  }

  const { data, error } = await query.select('updated_at, audience, status').maybeSingle()
  if (error) return failFromProvider('unavailable', messageForPublishError(error), error)
  if (!data) {
    const remote = await supabase
      .from('creations')
      .select('id, author_id, updated_at, is_removed')
      .eq('id', input.id)
      .maybeSingle()
    const account = await supabase
      .from('profiles_public')
      .select('status, suspended_until')
      .eq('id', userId)
      .maybeSingle()
    const accountSnapshot =
      account.data?.status === 'active' ||
      account.data?.status === 'suspended' ||
      account.data?.status === 'banned'
        ? {
            status: account.data.status,
            suspendedUntil: account.data.suspended_until,
          }
        : null
    return classifyPublishZeroRowUpdate({
      viewerUserId: userId,
      row: remote.data
        ? {
            id: remote.data.id,
            authorId: remote.data.author_id,
            updatedAt: remote.data.updated_at,
            isRemoved: remote.data.is_removed,
          }
        : null,
      expectedUpdatedAt: input.expectedUpdatedAt,
      account: accountSnapshot,
    })
  }

  return { ok: true, updatedAt: data.updated_at, audience: data.audience, status: data.status }
}

const PUBLISHED_LIST_COLUMNS =
  'id, type, title, cover_url, published_at, audience, like_count, comment_count, body_text, body_json' as const

export async function listUserPublished(
  userId: string,
  cursor: import('./publishedCursor.ts').PublishedCursor | null,
): Promise<CreationResult<PublishedWorksPage>> {
  if (cursor && !isPublishedCursor(cursor)) return fail('invalid', 'We could not load the next page.')

  const viewerId = await currentUserId()
  let query = supabase
    .from('creations')
    .select(PUBLISHED_LIST_COLUMNS)
    .eq('author_id', userId)
    .eq('status', 'published')
    .eq('is_removed', false)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PUBLISHED_PAGE_SIZE + 1)

  if (shouldLimitProfileWorksToPublic(userId, viewerId)) {
    query = query.eq('audience', 'public')
  }

  const filter = publishedCursorFilter(cursor)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) return failFromProvider('unavailable', 'We could not load works. Try again.', error)

  const mapped = (data ?? []).flatMap((row) => {
    const publishedAt = text(row.published_at)
    const id = text(row.id)
    const type = row.type
    const audience = row.audience
    if (!publishedAt || !id || typeof type !== 'string' || typeof audience !== 'string') return []
    return [
      {
        publishedAt,
        id,
        work: {
          id,
          type: type as PublishedWorksPage['works'][number]['type'],
          title: text(row.title),
          coverUrl: text(row.cover_url),
          publishedAt,
          audience: audience as PublishedWorksPage['works'][number]['audience'],
          likeCount: typeof row.like_count === 'number' ? row.like_count : 0,
          commentCount: typeof row.comment_count === 'number' ? row.comment_count : 0,
          bodyText: text(row.body_text),
          bodyJson: row.body_json ?? null,
        },
      },
    ]
  })

  const { page, nextCursor } = nextPublishedCursor(mapped)
  return { ok: true, data: { works: page.map((entry) => entry.work), nextCursor } }
}

export async function listMyDraftsPage(
  cursor: import('./draftsCursor.ts').DraftsCursor | null,
): Promise<CreationResult<DraftListPage>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in again to see your drafts.')
  if (cursor && !isDraftsCursor(cursor)) return fail('invalid', 'We could not load the next page.')

  let query = supabase
    .from('creations')
    .select('id, type, title, status, audience, updated_at, is_removed')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(DRAFTS_PAGE_SIZE + 1)

  const filter = draftsCursorFilter(cursor)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) return failFromProvider('unavailable', 'We could not load your drafts. Try again.', error)

  const mapped = (data ?? []).map((row) => ({
    updatedAt: row.updated_at,
    id: row.id,
    row: {
      id: row.id,
      type: row.type,
      title: row.title,
      status: row.status,
      audience: row.audience,
      updatedAt: row.updated_at,
      removed: row.is_removed || row.status === 'removed',
    } satisfies DraftListRow,
  }))

  const { page, nextCursor } = nextDraftsCursor(mapped)
  const rows = page.map((entry) => entry.row)

  return { ok: true, data: { rows, nextCursor } }
}

/** Author fields for cards; never reads profiles.city. */
export const CREATION_AUTHOR_PUBLIC_COLUMNS = 'id, username, display_name, avatar_url, verified' as const
