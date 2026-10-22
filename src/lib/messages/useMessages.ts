import { useContext } from 'react'
import { MessagesContext } from './messages-context.ts'

export function useMessages() {
  const ctx = useContext(MessagesContext)
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider')
  return ctx
}

export function useMessagesUnreadBadge(): number {
  const ctx = useContext(MessagesContext)
  return ctx?.unreadCount ?? 0
}
