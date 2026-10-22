/**
 * Playwright-only Supabase REST mocks for direct messages (Prompt 15A/15B).
 */
import { OTHER, READER, SAMPLE_CREATION_ID } from './fixtures.ts'

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

export const E2E_CONVERSATION_ID = '00000000-0000-0000-0000-0000000000d1'
const E2E_MESSAGE_ID = '00000000-0000-0000-0000-000000000001'
export const E2E_SCHEDULED_MESSAGE_ID = '00000000-0000-0000-0000-000000000009'

type ConversationRow = Record<string, unknown>
type MessageRow = Record<string, unknown>

let conversations: ConversationRow[] = []
let messages: MessageRow[] = []
let unreadOverride: number | null = null
let quietStatus: Record<string, unknown> | null = null
let canMessage = true
let memberMuted = false
let sendShouldFail = false
let sendFailCount = 0
let messageReportId: string | null = null

function seed() {
  const now = new Date().toISOString()
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString()
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
      id: '00000000-0000-0000-0000-000000000002',
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
    {
      id: E2E_SCHEDULED_MESSAGE_ID,
      conversation_id: E2E_CONVERSATION_ID,
      sender_id: READER.id,
      body: 'Scheduled hello',
      shared_creation_id: null,
      deliver_at: future,
      created_at: now,
      deleted_at: null,
      is_deleted: false,
      is_scheduled: true,
    },
  ]
  messageReportId = '00000000-0000-0000-0000-0000000000a1'
}

export function resetMessageMocks() {
  unreadOverride = null
  quietStatus = null
  canMessage = true
  memberMuted = false
  sendShouldFail = false
  sendFailCount = 0
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

/** Fail the next N send_message RPC calls (for optimistic retry e2e). */
export function setMessageSendFails(count: number) {
  sendShouldFail = count > 0
  sendFailCount = count
}

export function messageReportQueueRow(): Record<string, unknown> {
  return {
    report_id: messageReportId,
    reported_at: '2026-01-04T00:00:00.000Z',
    target_type: 'message',
    target_id: E2E_MESSAGE_ID,
    reason: 'harassment',
    details: 'Reported DM',
    status: 'open',
    reporter_id: OTHER.id,
    reporter_username: OTHER.username,
    reported_user_id: READER.id,
    reported_username: READER.username,
    reported_display_name: READER.display_name,
    reported_user_status: 'active',
    prior_reports_against_user: 0,
    warnings_against_user: 0,
    moderation_actions_against_user: 0,
    target_snapshot: null,
  }
}

function unreadTotal(): number {
  if (unreadOverride !== null) return unreadOverride
  return conversations.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0)
}

function rpcBody(postData: unknown): Record<string, unknown> {
  if (!postData || typeof postData !== 'object') return {}
  return postData as Record<string, unknown>
}

function visibleMessages(conversationId: string): MessageRow[] {
  const now = Date.now()
  return messages.filter((row) => {
    if (row.conversation_id !== conversationId) return false
    const deliverAt = String(row.deliver_at ?? '')
    const deliverMs = new Date(deliverAt).getTime()
    if (row.is_scheduled && deliverMs > now) {
      // Scheduled messages visible only to sender in messages_visible semantics
      return row.sender_id === READER.id
    }
    return true
  })
}

export function messageMockHandleRest(url: string, method: string, postData: unknown): Json | undefined {
  if (!url.includes('/rest/v1/')) return undefined

  if (url.includes('/rest/v1/rpc/message_unread_total')) {
    return unreadTotal()
  }

  if (url.includes('/rest/v1/rpc/list_my_conversations')) {
    return conversations
  }

  if (url.includes('/rest/v1/rpc/search_dm_writers')) {
    const body = rpcBody(postData)
    const q = String(body.p_query ?? '').toLowerCase()
    const hits = [
      {
        id: OTHER.id,
        username: OTHER.username,
        display_name: OTHER.display_name,
        avatar_url: null,
        can_message: canMessage,
      },
    ].filter((row) => row.username.includes(q) || row.display_name.toLowerCase().includes(q))
    return hits
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

  if (url.includes('/rest/v1/rpc/cancel_scheduled_message')) {
    const body = rpcBody(postData)
    const mid = String(body.p_message_id ?? '')
    messages = messages.filter((row) => row.id !== mid)
    return null
  }

  if (url.includes('/rest/v1/rpc/send_message')) {
    if (sendShouldFail && sendFailCount > 0) {
      sendFailCount -= 1
      if (sendFailCount <= 0) sendShouldFail = false
      return { __httpError: { status: 500, message: 'Could not send your message.' } } as unknown as Json
    }
    const body = rpcBody(postData)
    const id = `00000000-0000-0000-0000-${String(Date.now()).slice(-12).padStart(12, '0')}`
    const now = new Date().toISOString()
    const deliverAt = body.p_deliver_at ?? now
    messages.push({
      id,
      conversation_id: String(body.p_conversation_id),
      sender_id: READER.id,
      body: String(body.p_body ?? ''),
      shared_creation_id: body.p_shared_creation_id ?? null,
      deliver_at: deliverAt,
      created_at: now,
      deleted_at: null,
      is_deleted: false,
      is_scheduled: Boolean(String(deliverAt) > now),
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
    return visibleMessages(conversationId ?? '')
  }

  if (url.includes('/rest/v1/reports') && method === 'POST') {
    const row = postData as Record<string, unknown>
    if (row.target_type === 'message') {
      messageReportId = `00000000-0000-0000-0000-${String(Date.now()).slice(-12).padStart(12, '0')}`
    }
    return [{ id: messageReportId ?? '00000000-0000-0000-0000-000000000099' }]
  }

  if (url.includes('/rest/v1/rpc/view_reported_private_content')) {
    const body = rpcBody(postData)
    const reportId = String(body.p_report_id ?? '')
    if (reportId === messageReportId) {
      return {
        target_type: 'message',
        reported_message: {
          id: E2E_MESSAGE_ID,
          body: 'Hello from Writer Two',
          sender_id: OTHER.id,
          conversation_id: E2E_CONVERSATION_ID,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        context: [
          { id: E2E_MESSAGE_ID, body: 'Hello from Writer Two', sender_id: OTHER.id },
          { id: '00000000-0000-0000-0000-000000000002', body: 'Hi back', sender_id: READER.id },
        ],
      }
    }
  }

  if (url.includes('/rest/v1/creations') && url.includes(SAMPLE_CREATION_ID)) {
    return [
      {
        id: SAMPLE_CREATION_ID,
        title: 'Sample post',
        caption: null,
        body_text: 'Sample body for share preview',
        author: { username: OTHER.username, display_name: OTHER.display_name },
      },
    ]
  }

  return undefined
}
