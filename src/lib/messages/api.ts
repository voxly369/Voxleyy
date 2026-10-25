import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { parseQuietStatus } from './quietPrompt.ts'
import type {
  ConversationSummary,
  DmSharePostHit,
  DmWriterHit,
  MessageFailure,
  MessageResult,
  QuietStatus,
  SharedCreationPreview,
  VisibleMessage,
} from './types.ts'

function fail(
  code: MessageFailure['error']['code'],
  message: string,
  error?: { code?: string; status?: number; message?: string },
): MessageFailure {
  const providerMessage = error?.message?.trim()
  const friendly =
    providerMessage && !providerMessage.toLowerCase().includes('jwt')
      ? providerMessage
      : message
  if (providerMessage?.toLowerCase().includes('too fast')) {
    return { ok: false, error: { code: 'rate_limited', message: friendly, ...providerFields(error) } }
  }
  return { ok: false, error: { code, message: friendly, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function bool(value: unknown): boolean {
  return value === true
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function parseConversation(row: Record<string, unknown>): ConversationSummary | null {
  const conversationId = text(row.conversation_id)
  const lastActivityAt = text(row.last_activity_at)
  const otherUserId = text(row.other_user_id)
  const otherAccountDeleted = bool(row.other_account_deleted)
  const otherUsername = text(row.other_username)
  if (!conversationId || !lastActivityAt || !otherUserId) return null
  if (!otherAccountDeleted && !otherUsername) return null
  const username = otherUsername ?? 'deleted-account'
  return {
    conversationId,
    lastActivityAt,
    muted: bool(row.muted),
    otherUserId,
    otherUsername: username,
    otherDisplayName: text(row.other_display_name) ?? username,
    otherAvatarUrl: text(row.other_avatar_url),
    otherCountry: text(row.other_country),
    otherShowLocalTime: row.other_show_local_time !== false,
    otherTimezone: text(row.other_timezone) ?? 'UTC',
    otherAccountDeleted,
    otherVerified: bool(row.other_verified),
    unreadCount: count(row.unread_count),
    preview: text(row.preview),
  }
}

function parseMessage(row: Record<string, unknown>): VisibleMessage | null {
  const id = text(row.id)
  const conversationId = text(row.conversation_id)
  const senderId = text(row.sender_id)
  const senderAccountDeleted = bool(row.sender_account_deleted)
  const deliverAt = text(row.deliver_at)
  const createdAt = text(row.created_at)
  if (!id || !conversationId || !deliverAt || !createdAt) return null
  if (!senderId && !senderAccountDeleted) return null
  const body = row.body === null ? null : text(row.body)
  return {
    id,
    conversationId,
    senderId,
    body,
    sharedCreationId: text(row.shared_creation_id),
    deliverAt,
    createdAt,
    deletedAt: text(row.deleted_at),
    isDeleted: bool(row.is_deleted),
    isScheduled: bool(row.is_scheduled),
    senderAccountDeleted,
  }
}

export async function fetchUnreadTotal(): Promise<MessageResult<number>> {
  const { data, error } = await supabase.rpc('message_unread_total')
  if (error) return fail('unavailable', 'Could not load unread messages.', error)
  return { ok: true, data: typeof data === 'number' ? data : 0 }
}

export async function listConversations(cursor: string | null, limit = 30): Promise<MessageResult<ConversationSummary[]>> {
  const { data, error } = await supabase.rpc('list_my_conversations', {
    p_cursor: cursor,
    p_limit: limit,
  })
  if (error) return fail('unavailable', 'Could not load conversations.', error)
  let list: unknown = data
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list) as unknown
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list)) return { ok: true, data: [] }
  const rows: ConversationSummary[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const parsed = parseConversation(item as Record<string, unknown>)
    if (parsed) rows.push(parsed)
  }
  return { ok: true, data: rows }
}

export async function getOrCreateDm(otherUserId: string): Promise<MessageResult<string>> {
  const { data, error } = await supabase.rpc('get_or_create_dm', { p_other: otherUserId })
  if (error) {
    const code = error.message?.includes('cannot message') ? 'forbidden' : 'unavailable'
    return fail(code, 'You cannot message this person.', error)
  }
  if (typeof data !== 'string') return fail('unavailable', 'Could not open conversation.')
  return { ok: true, data }
}

export async function canUserMessage(recipientId: string): Promise<MessageResult<boolean>> {
  const { data: userData } = await supabase.auth.getUser()
  const senderId = userData.user?.id
  if (!senderId) return fail('forbidden', 'Sign in to send messages.')
  const { data, error } = await supabase.rpc('can_user_message', {
    p_sender: senderId,
    p_recipient: recipientId,
  })
  if (error) return fail('unavailable', 'Could not check messaging permission.', error)
  return { ok: true, data: data === true }
}

export async function fetchThreadMessages(conversationId: string): Promise<MessageResult<VisibleMessage[]>> {
  const { data, error } = await supabase
    .from('messages_visible')
    .select(
      'id, conversation_id, sender_id, body, shared_creation_id, deliver_at, created_at, deleted_at, is_deleted, is_scheduled, sender_account_deleted',
    )
    .eq('conversation_id', conversationId)
    .order('deliver_at', { ascending: true })
  if (error) return fail('unavailable', 'Could not load messages.', error)
  const rows: VisibleMessage[] = []
  for (const item of data ?? []) {
    const parsed = parseMessage(item as Record<string, unknown>)
    if (parsed) rows.push(parsed)
  }
  return { ok: true, data: rows }
}

export async function sendMessage(input: {
  conversationId: string
  body: string
  sharedCreationId?: string | null
  deliverAt?: string | null
}): Promise<MessageResult<string>> {
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: input.conversationId,
    p_body: input.body,
    p_shared_creation_id: input.sharedCreationId ?? null,
    p_deliver_at: input.deliverAt ?? null,
  })
  if (error) {
    let code: MessageFailure['error']['code'] = 'unavailable'
    if (error.message?.includes('cannot message') || error.message?.includes('Not a member')) code = 'forbidden'
    if (error.message?.includes('too fast') || error.message?.includes('daily message limit')) code = 'rate_limited'
    if (error.message?.includes('between 1 and 2000')) code = 'invalid'
    return fail(code, 'Could not send your message.', error)
  }
  if (typeof data !== 'string') return fail('unavailable', 'Could not send your message.')
  return { ok: true, data }
}

export async function deleteMessage(messageId: string): Promise<MessageResult<void>> {
  const { error } = await supabase.rpc('delete_message', { p_message_id: messageId })
  if (error) return fail('unavailable', 'Could not delete message.', error)
  return { ok: true, data: undefined }
}

export async function cancelScheduledMessage(messageId: string): Promise<MessageResult<void>> {
  const { error } = await supabase.rpc('cancel_scheduled_message', { p_message_id: messageId })
  if (error) {
    const code = error.message?.includes('Only scheduled') ? 'invalid' : 'unavailable'
    return fail(code, error.message ?? 'Could not cancel scheduled message.', error)
  }
  return { ok: true, data: undefined }
}

export async function searchDmWriters(query: string): Promise<MessageResult<DmWriterHit[]>> {
  const { data, error } = await supabase.rpc('search_dm_writers', { p_query: query.trim() })
  if (error) return fail('unavailable', 'Could not search writers.', error)
  let list: unknown = data
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list) as unknown
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list)) return { ok: true, data: [] }
  const rows: DmWriterHit[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = text(row.id)
    const username = text(row.username)
    if (!id || !username) continue
    rows.push({
      id,
      username,
      displayName: text(row.display_name) ?? username,
      avatarUrl: text(row.avatar_url),
      canMessage: row.can_message === true,
    })
  }
  return { ok: true, data: rows }
}

export async function searchDmSharePosts(query: string): Promise<MessageResult<DmSharePostHit[]>> {
  const safe = query.trim()
  const { data, error } = await supabase.rpc('search_discovery', {
    p_query: safe.length > 0 ? safe : 'a',
    p_tab: 'posts',
    p_limit: 20,
  })
  if (error) return fail('unavailable', 'Could not search posts.', error)
  const payload = (data ?? {}) as Record<string, unknown>
  const posts = Array.isArray(payload.posts) ? payload.posts : []
  const rows: DmSharePostHit[] = []
  for (const item of posts) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = text(row.id)
    if (!id) continue
    rows.push({
      id,
      title: text(row.title),
      caption: text(row.caption),
      excerpt: text(row.body_excerpt),
      authorUsername: text(row.author_username) ?? 'writer',
      authorDisplayName: text(row.author_display_name) ?? 'Writer',
    })
  }
  return { ok: true, data: rows }
}

export async function markConversationRead(conversationId: string): Promise<MessageResult<void>> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
  if (error) return fail('unavailable', 'Could not update read state.', error)
  return { ok: true, data: undefined }
}

export async function setConversationMuted(conversationId: string, muted: boolean): Promise<MessageResult<void>> {
  const { error } = await supabase.rpc('set_conversation_muted', {
    p_conversation_id: conversationId,
    p_muted: muted,
  })
  if (error) return fail('unavailable', 'Could not update mute setting.', error)
  return { ok: true, data: undefined }
}

export async function fetchRecipientQuietStatus(recipientId: string): Promise<MessageResult<QuietStatus | null>> {
  const { data, error } = await supabase.rpc('recipient_quiet_status', { p_recipient: recipientId })
  if (error) return fail('unavailable', 'Could not check quiet mode.', error)
  return { ok: true, data: parseQuietStatus(data) }
}

export async function fetchSharedCreationPreview(creationId: string): Promise<MessageResult<SharedCreationPreview | null>> {
  const { data, error } = await supabase
    .from('creations')
    .select('id, title, caption, body_text, author:profiles_public!creations_author_id_fkey(username, display_name, verified)')
    .eq('id', creationId)
    .maybeSingle()
  if (error) return fail('unavailable', 'Could not load shared post.', error)
  if (!data) return { ok: true, data: null }
  const row = data as Record<string, unknown>
  const author = row.author as Record<string, unknown> | null
  const bodyText = text(row.body_text)
  return {
    ok: true,
    data: {
      id: text(row.id) ?? creationId,
      title: text(row.title),
      caption: text(row.caption),
      excerpt: bodyText ? bodyText.slice(0, 160) : null,
      authorUsername: text(author?.username) ?? 'writer',
      authorDisplayName: text(author?.display_name) ?? 'Writer',
      authorVerified: author?.verified === true,
    },
  }
}
