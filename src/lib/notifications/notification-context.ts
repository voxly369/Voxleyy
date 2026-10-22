import { createContext, type RefObject } from 'react'
import type { NotificationSettings } from './types.ts'

export type NotificationContextValue = {
  unreadCount: number
  quietActive: boolean
  settings: NotificationSettings | null
  refresh: () => Promise<void>
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  panelAnchorRef: RefObject<HTMLElement | null>
  registerPanelAnchor: (element: HTMLElement | null) => void
}

export const NotificationContext = createContext<NotificationContextValue | null>(null)
