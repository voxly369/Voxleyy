import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { useToast } from '../shell/useToast.ts'
import { supabase } from '../supabaseClient.ts'
import {
  fetchNotificationSettings,
  fetchUnreadCount,
  syncDetectedTimezoneIfDefault,
} from './api.ts'
import { createInAppDelivery } from './delivery.ts'
import { isQuietModeActive } from './quietMode.ts'
import { NotificationContext } from './notification-context.ts'
import type { NotificationRow, NotificationSettings } from './types.ts'
import { buildDisplayText } from './notificationText.ts'

const POLL_MS = 60_000

function parseRealtimeRow(value: Record<string, unknown>): NotificationRow | null {
  const id = typeof value.id === 'string' ? value.id : null
  const type = typeof value.type === 'string' ? value.type : null
  const createdAt = typeof value.created_at === 'string' ? value.created_at : null
  if (!id || !type || !createdAt) return null
  return {
    id,
    type: type as NotificationRow['type'],
    actor: {
      id: typeof value.actor_id === 'string' ? value.actor_id : null,
      username: null,
      displayName: null,
      avatarUrl: null,
      verified: false,
    },
    targetType: typeof value.target_type === 'string' ? value.target_type : null,
    targetId: typeof value.target_id === 'string' ? value.target_id : null,
    data: value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? (value.data as Record<string, unknown>) : {},
    held: value.held === true,
    createdAt,
    readAt: typeof value.read_at === 'string' ? value.read_at : null,
    targetTitle: null,
    targetExcerpt: null,
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const userId = user?.id ?? null

  const [unreadCount, setUnreadCount] = useState(0)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const panelAnchorRef = useRef<HTMLElement | null>(null)
  const settingsRef = useRef<NotificationSettings | null>(null)

  const registerPanelAnchor = useCallback((element: HTMLElement | null) => {
    panelAnchorRef.current = element
  }, [])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const quietActive = useMemo(
    () => (settings ? isQuietModeActive(settings) : false),
    [settings],
  )

  const delivery = useMemo(
    () =>
      createInAppDelivery({
        quietActive,
        showToast(message) {
          showToast(message)
        },
      }),
    [quietActive, showToast],
  )

  const refresh = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0)
      setSettings(null)
      return
    }
    const [countResult, settingsResult] = await Promise.all([fetchUnreadCount(), fetchNotificationSettings()])
    if (countResult.ok) setUnreadCount(countResult.data)
    if (settingsResult.ok) setSettings(settingsResult.data)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    void syncDetectedTimezoneIfDefault().then(() => refresh())
  }, [userId, refresh])

  useEffect(() => {
    if (!userId) return
    const timer = window.setInterval(() => {
      void fetchUnreadCount().then((result) => {
        if (result.ok) setUnreadCount(result.data)
      })
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [userId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let e2e = false
    try {
      e2e = localStorage.getItem('voxly-e2e-notifications') === '1'
    } catch {
      e2e = false
    }
    if (!e2e) return
    ;(
      window as unknown as { __voxlyE2ePushNotification?: (row: NotificationRow) => void }
    ).__voxlyE2ePushNotification = (row) => delivery.showToast(row)
    return () => {
      delete (window as unknown as { __voxlyE2ePushNotification?: (row: NotificationRow) => void })
        .__voxlyE2ePushNotification
    }
  }, [delivery])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          void fetchUnreadCount().then((result) => {
            if (result.ok) setUnreadCount(result.data)
          })
          const row = parseRealtimeRow(payload.new as Record<string, unknown>)
          if (row) {
            delivery.showToast({
              ...row,
              actor: row.actor,
            })
          } else {
            showToast('New notification')
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => {
          void fetchUnreadCount().then((result) => {
            if (result.ok) setUnreadCount(result.data)
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, delivery, showToast])

  const value = useMemo(
    () => ({
      unreadCount,
      quietActive,
      settings,
      refresh,
      panelOpen,
      setPanelOpen,
      panelAnchorRef: panelAnchorRef as RefObject<HTMLElement | null>,
      registerPanelAnchor,
    }),
    [unreadCount, quietActive, settings, refresh, panelOpen, registerPanelAnchor],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

/** For tests: build toast text without provider. */
export function previewNotificationToast(row: NotificationRow): string {
  return buildDisplayText(row)
}
