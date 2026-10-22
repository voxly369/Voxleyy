import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { supabase } from '../supabaseClient.ts'
import { fetchUnreadTotal, listConversations } from './api.ts'
import { MessagesContext } from './messages-context.ts'
import type { ConversationSummary } from './types.ts'

const POLL_MS = 60_000
const PAGE_SIZE = 30

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [unreadCount, setUnreadCount] = useState(0)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [hasMoreConversations, setHasMoreConversations] = useState(false)

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0)
      return
    }
    const result = await fetchUnreadTotal()
    if (result.ok) setUnreadCount(result.data)
  }, [userId])

  const refresh = useCallback(async () => {
    if (!userId) {
      setConversations([])
      setUnreadCount(0)
      setHasMoreConversations(false)
      return
    }
    setConversationsLoading(true)
    setConversationsError(null)
    const [listResult, unreadResult] = await Promise.all([listConversations(null, PAGE_SIZE), fetchUnreadTotal()])
    setConversationsLoading(false)
    if (!listResult.ok) {
      setConversationsError(listResult.error.message)
      return
    }
    setConversations(listResult.data)
    setHasMoreConversations(listResult.data.length >= PAGE_SIZE)
    if (unreadResult.ok) setUnreadCount(unreadResult.data)
  }, [userId])

  const loadMoreConversations = useCallback(async () => {
    if (!userId || conversations.length === 0) return
    const cursor = conversations[conversations.length - 1]?.lastActivityAt ?? null
    const result = await listConversations(cursor, PAGE_SIZE)
    if (!result.ok) {
      setConversationsError(result.error.message)
      return
    }
    setConversations((prev) => {
      const seen = new Set(prev.map((row) => row.conversationId))
      const merged = [...prev]
      for (const row of result.data) {
        if (!seen.has(row.conversationId)) merged.push(row)
      }
      return merged
    })
    setHasMoreConversations(result.data.length >= PAGE_SIZE)
  }, [userId, conversations])

  const upsertConversation = useCallback((row: ConversationSummary) => {
    setConversations((prev) => {
      const rest = prev.filter((item) => item.conversationId !== row.conversationId)
      return [row, ...rest].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    })
  }, [])

  const patchConversation = useCallback((conversationId: string, patch: Partial<ConversationSummary>) => {
    setConversations((prev) =>
      prev.map((row) => (row.conversationId === conversationId ? { ...row, ...patch } : row)),
    )
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!userId) return
    const timer = window.setInterval(() => {
      void refreshUnread()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [userId, refreshUnread])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          void refreshUnread()
          void refresh()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          void refreshUnread()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}` },
        () => {
          void refreshUnread()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, refresh, refreshUnread])

  const value = useMemo(
    () => ({
      unreadCount,
      conversations,
      conversationsLoading,
      conversationsError,
      refresh,
      refreshUnread,
      loadMoreConversations,
      hasMoreConversations,
      upsertConversation,
      patchConversation,
    }),
    [
      unreadCount,
      conversations,
      conversationsLoading,
      conversationsError,
      refresh,
      refreshUnread,
      loadMoreConversations,
      hasMoreConversations,
      upsertConversation,
      patchConversation,
    ],
  )

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}
