/**
 * Playwright-only Supabase REST mocks for direct messages (Prompt 15A).
 */
import { OTHER, READER, SAMPLE_CREATION_ID } from './fixtures.ts'

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

export const E2E_CONVERSATION_ID = '00000000-0000-0000-0000-0000000000d1'
const E2E_MESSAGE_ID = '00000000-0000-0000-0000-0000000000m1'

type ConversationRow = Record<string, unknown>
type MessageRow = Record<string, unknown>

let conversations: ConversationRow[] = []
let messages: MessageRow[] = []
let unreadOverride: number | null = null
let quietStatus: Record<string, unknown> | null = null
let canMessage = true
let memberMuted = false

function seed() {
  const now = new Date().toISOString()
  conversations = [
    {
      conversation_id: E2E_CONVERSATION_ID,
      last_activity_at: now,
      muted: false,
      other_user_id: OTHER.id,
      other_username: OTHER.username,
      other_display_name: OTHER.display_name,
      other_avatar_url: null,
      other_show_local_time: false,
      other_timezone: 'UTC',
      unread_count: 2,
      preview: 'Hello from Writer Two',
    },
  ]
  messages = [
    {
      id: E2E_MESSAGE_ID,
      conversation_id: E2E_CONVERSATION_ID,
      sender_id: OTHER.id,
      body: 'Hello from Writer Two',
      shared_creation_id: null,
      deliver_at: now,
      created_at: now,
      deleted_at: null,
      is_deleted: false,
      is_scheduled: false,
    },
    {
      id: '00000000-0000-0000-0000-0000000000m2',
      conversation_id: E2E_CONVERSATION_ID,
      sender_id: READER.id,
      body: 'Hi back',
      shared_creation_id: null,
      deliver_at: now,
      created_at: now,
      deleted_at: null,
      is_deleted: false,
      is_scheduled: false,
    },
  ]
}

export function resetMessageMocks() {
  unreadOverride = null
  quietStatus = null
  canMessage = true
  memberMuted = false
  seed()
}

export function setMessageUnreadOverride(count: number | null) {
  unreadOverride = count
}

export function bumpMessageUnread() {
  unreadOverride = (unreadOverride ?? conversations.reduce((sum, c) => sum + Number(c.unread_count ?? 0), 0)) + 1
  conversations = conversations.map((c) => ({ ...c, unread_count: Number(c.unread_count ?? 0) + 1 }))
}

export function setMessageQuietStatus(value: Record<string, unknown> | null) {
  quietStatus = value
}

export function setMessageCanMessage(value: boolean) {
  canMessage = value
}

function unreadTotal(): number {
  if (unreadOverride !== null) return unreadOverride
  return conversations.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0)
}

function rpcBody(postData: unknown): Record<string, unknown> {
  if (!postData || typeof postData !== 'object') return {}
  return postData as Record<string, unknown>
}

export function messageMockHandleRest(url: string, method: string, postData: unknown): Json | undefined {
  if (!url.includes('/rest/v1/')) return undefined

  if (url.includes('/rest/v1/rpc/message_unread_total')) {
    return unreadTotal()
  }

  if (url.includes('/rest/v1/rpc/list_my_conversations')) {
    return conversations
  }

  if (url.includes('/rest/v1/rpc/get_or_create_dm')) {
    if (!canMessage) {
      return { __httpError: { status: 400, message: 'You cannot message this person.' } } as unknown as Json
    }
    return E2E_CONVERSATION_ID
  }

  if (url.includes('/rest/v1/rpc/can_user_message')) {
    return canMessage
  }

  if (url.includes('/rest/v1/rpc/recipient_quiet_status')) {
    return quietStatus
  }

  if (url.includes('/rest/v1/rpc/mark_conversation_read')) {
    const body = rpcBody(postData)
    const id = String(body.p_conversation_id ?? '')
    conversations = conversations.map((row) =>
      row.conversation_id === id ? { ...row, unread_count: 0 } : row,
    )
    unreadOverride = unreadTotal()
    return null
  }

  if (url.includes('/rest/v1/rpc/set_conversation_muted')) {
    const body = rpcBody(postData)
    memberMuted = body.p_muted === true
    const id = String(body.p_conversation_id ?? '')
    conversations = conversations.map((row) =>
      row.conversation_id === id ? { ...row, muted: memberMuted } : row,
    )
    return null
  }

  if (url.includes('/rest/v1/rpc/send_message')) {
    const body = rpcBody(postData)
    const id = `00000000-0000-0000-0000-${String(Date.now()).slice(-12)}m`
    const now = new Date().toISOString()
    messages.push({
      id,
      conversation_id: String(body.p_conversation_id),
      sender_id: READER.id,
      body: String(body.p_body ?? ''),
      shared_creation_id: body.p_shared_creation_id ?? null,
      deliver_at: body.p_deliver_at ?? now,
      created_at: now,
      deleted_at: null,
      is_deleted: false,
      is_scheduled: Boolean(body.p_deliver_at && String(body.p_deliver_at) > now),
    })
    return id
  }

  if (url.includes('/rest/v1/rpc/delete_message')) {
    const body = rpcBody(postData)
    const mid = String(body.p_message_id ?? '')
    messages = messages.map((row) =>
      row.id === mid ? { ...row, deleted_at: new Date().toISOString(), is_deleted: true, body: null } : row,
    )
    return null
  }

  if (url.includes('/rest/v1/messages_visible')) {
    const idMatch = url.match(/conversation_id=eq\.([^&]+)/)
    const conversationId = idMatch?.[1]
    return messages.filter((row) => row.conversation_id === conversationId)
  }

  return undefined
}
