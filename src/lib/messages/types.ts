export type MessageFailureCode = 'forbidden' | 'unavailable' | 'invalid' | 'rate_limited'

export type MessageFailure = {
  ok: false
  error: {
    code: MessageFailureCode
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type MessageResult<T> = { ok: true; data: T } | MessageFailure

export type WhoCanMessage = 'everyone' | 'followers' | 'subscribers'

export type ConversationSummary = {
  conversationId: string
  lastActivityAt: string
  muted: boolean
  otherUserId: string
  otherUsername: string
  otherDisplayName: string
  otherAvatarUrl: string | null
  otherShowLocalTime: boolean
  otherTimezone: string
  unreadCount: number
  preview: string | null
}

export type QuietStatus = {
  on: true
  endsAt: string | null
  label: string
}

export type VisibleMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string | null
  sharedCreationId: string | null
  deliverAt: string
  createdAt: string
  deletedAt: string | null
  isDeleted: boolean
  isScheduled: boolean
}

export type LocalMessageStatus = 'sending' | 'failed'

export type ThreadMessage = VisibleMessage & {
  localStatus?: LocalMessageStatus
  clientId?: string
}

export type DmWriterHit = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  canMessage: boolean
}

export type DmSharePostHit = {
  id: string
  title: string | null
  caption: string | null
  excerpt: string | null
  authorUsername: string
  authorDisplayName: string
}

export type SharedCreationPreview = {
  id: string
  title: string | null
  caption: string | null
  excerpt: string | null
  authorUsername: string
  authorDisplayName: string
}

export const MESSAGE_BODY_MAX = 2000
