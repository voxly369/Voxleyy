import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { buildCommentTree, type CommentAuthor, type CommentNode, type CommentRow } from './commentTree.ts'
import { engagementErrorMessage } from './errors.ts'

export type CommentCursor = { createdAt: string; id: string }

export const COMMENTS_PAGE_SIZE = 20

const ISOish =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/
const UUIDish = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const AUTHOR_COLUMNS = 'id, username, display_name, avatar_url, verified'

export type CommentsFailure = {
  ok: false
  error: {
    code: 'invalid' | 'forbidden' | 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type CommentsPage = {
  comments: CommentNode[]
  nextCursor: CommentCursor | null
}

export type CommentsResult = { ok: true; data: CommentsPage } | CommentsFailure

function fail(code: CommentsFailure['error']['code'], message: string, error?: { code?: string; status?: number }): CommentsFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function isCommentCursor(value: unknown): value is CommentCursor {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.createdAt === 'string' &&
    ISOish.test(row.createdAt) &&
    typeof row.id === 'string' &&
    UUIDish.test(row.id)
  )
}

function commentCursorFilter(cursor: CommentCursor | null): string | null {
  if (!cursor) return null
  const at = cursor.createdAt.replace(/"/g, '\\"')
  const id = cursor.id.replace(/"/g, '\\"')
  return `created_at.lt."${at}",and(created_at.eq."${at}",id.lt."${id}")`
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

function parseCommentAuthor(value: unknown): CommentAuthor | null {
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

function mapCommentRow(row: Record<string, unknown>): CommentRow | null {
  const id = text(row.id)
  const creationId = text(row.creation_id)
  const authorId = text(row.author_id)
  const body = text(row.body)
  const createdAt = text(row.created_at)
  const updatedAt = text(row.updated_at)
  if (!id || !creationId || !authorId || body === null || !createdAt || !updatedAt) return null
  return {
    id,
    creationId,
    authorId,
    parentId: text(row.parent_id),
    body,
    isRemoved: row.is_removed === true,
    createdAt,
    updatedAt,
  }
}

export async function listComments(
  creationId: string,
  cursor: CommentCursor | null,
  options: { viewerIsFounder: boolean },
): Promise<CommentsResult> {
  if (cursor && !isCommentCursor(cursor)) return fail('invalid', 'We could not load comments.')

  let topQuery = supabase
    .from('comments')
    .select(`id, creation_id, author_id, parent_id, body, is_removed, created_at, updated_at, author:profiles_public!comments_author_id_fkey(${AUTHOR_COLUMNS})`)
    .eq('creation_id', creationId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(COMMENTS_PAGE_SIZE + 1)

  const filter = commentCursorFilter(cursor)
  if (filter) topQuery = topQuery.or(filter)

  const { data: topData, error: topError } = await topQuery
  if (topError) return fail('unavailable', 'We could not load comments. Try again.', topError)

  const topRows = (topData ?? []).flatMap((row) => {
    const mapped = mapCommentRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })

  const hasMore = topRows.length > COMMENTS_PAGE_SIZE
  const topPage = hasMore ? topRows.slice(0, COMMENTS_PAGE_SIZE) : topRows
  const nextCursor =
    hasMore && topPage.length > 0
      ? { createdAt: topPage[topPage.length - 1].createdAt, id: topPage[topPage.length - 1].id }
      : null

  const topIds = topPage.map((row) => row.id)
  let replyRows: CommentRow[] = []
  if (topIds.length > 0) {
    const { data: replyData, error: replyError } = await supabase
      .from('comments')
      .select(`id, creation_id, author_id, parent_id, body, is_removed, created_at, updated_at, author:profiles_public!comments_author_id_fkey(${AUTHOR_COLUMNS})`)
      .eq('creation_id', creationId)
      .in('parent_id', topIds)
      .order('created_at', { ascending: true })

    if (replyError) return fail('unavailable', 'We could not load replies. Try again.', replyError)
    replyRows = (replyData ?? []).flatMap((row) => {
      const mapped = mapCommentRow(row as Record<string, unknown>)
      return mapped ? [mapped] : []
    })
  }

  const authors = new Map<string, CommentAuthor>()
  for (const row of [...topData ?? [], ...replyRows]) {
    const record = row as Record<string, unknown>
    const author = parseCommentAuthor(record.author)
    const authorId = text(record.author_id)
    if (author && authorId) authors.set(authorId, author)
  }

  const tree = buildCommentTree([...topPage, ...replyRows], authors, options)
  return { ok: true, data: { comments: tree, nextCursor } }
}

async function insertComment(input: {
  creationId: string
  body: string
  parentId: string | null
}): Promise<CommentsResult | { ok: true; id: string }> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in to comment.')

  const trimmed = input.body.trim()
  if (!trimmed) return fail('invalid', 'Write a comment before posting.')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      creation_id: input.creationId,
      author_id: userId,
      parent_id: input.parentId,
      body: trimmed,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    return fail(
      error.code === '42501' ? 'forbidden' : 'unavailable',
      engagementErrorMessage(error, 'We could not post your comment. Try again.'),
      error,
    )
  }
  if (!data?.id) return fail('unavailable', 'We could not post your comment. Try again.')

  return { ok: true, id: data.id }
}

export async function postComment(creationId: string, body: string): Promise<CommentsResult | { ok: true; id: string }> {
  return insertComment({ creationId, body, parentId: null })
}

export async function replyToComment(
  creationId: string,
  parentId: string,
  body: string,
): Promise<CommentsResult | { ok: true; id: string }> {
  return insertComment({ creationId, body, parentId })
}

export async function editOwnComment(commentId: string, body: string): Promise<CommentsResult | { ok: true }> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in to edit this comment.')

  const trimmed = body.trim()
  if (!trimmed) return fail('invalid', 'Write a comment before saving.')

  const { error } = await supabase.from('comments').update({ body: trimmed }).eq('id', commentId).eq('author_id', userId)
  if (error) {
    return fail(
      error.code === '42501' ? 'forbidden' : 'unavailable',
      engagementErrorMessage(error, 'We could not save your comment. Try again.'),
      error,
    )
  }
  return { ok: true }
}

export async function deleteOwnComment(commentId: string): Promise<CommentsResult | { ok: true }> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in to delete this comment.')

  const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('author_id', userId)
  if (error) {
    return fail(
      error.code === '42501' ? 'forbidden' : 'unavailable',
      engagementErrorMessage(error, 'We could not delete this comment. Try again.'),
      error,
    )
  }
  return { ok: true }
}
