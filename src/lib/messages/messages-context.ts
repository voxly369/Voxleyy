import { createContext } from 'react'
import type { ConversationSummary } from './types.ts'

export type MessagesContextValue = {
  unreadCount: number
  conversations: ConversationSummary[]
  conversationsLoading: boolean
  conversationsError: string | null
  refresh: () => Promise<void>
  refreshUnread: () => Promise<void>
  loadMoreConversations: () => Promise<void>
  hasMoreConversations: boolean
  upsertConversation: (row: ConversationSummary) => void
  patchConversation: (conversationId: string, patch: Partial<ConversationSummary>) => void
}

export const MessagesContext = createContext<MessagesContextValue | null>(null)
