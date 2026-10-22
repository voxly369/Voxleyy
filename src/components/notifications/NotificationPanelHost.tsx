import { NotificationPanel } from './NotificationPanel.tsx'
import { useNotifications } from '../../lib/notifications/useNotifications.ts'

export function NotificationPanelHost() {
  const { panelOpen, setPanelOpen, panelAnchorRef } = useNotifications()
  return (
    <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} anchorRef={panelAnchorRef} />
  )
}
