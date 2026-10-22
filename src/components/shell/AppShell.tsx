import { Outlet } from 'react-router-dom'
import { SuspendedBanner } from '../safety/SuspendedBanner.tsx'
import { WarningModal } from '../safety/WarningModal.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { CreateSheetProvider } from '../../lib/shell/CreateSheetProvider.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { VOXLY_APP_ROOT_ID } from '../../lib/shell/modalStackContext.ts'
import { BottomNav } from './BottomNav.tsx'
import { NavRail } from './NavRail.tsx'
import { SkipLink } from './SkipLink.tsx'
import { ToastProvider } from './ToastProvider.tsx'
import { focusRing } from './navItems.ts'
import { NotificationProvider } from '../../lib/notifications/NotificationProvider.tsx'
import { MessagesProvider } from '../../lib/messages/MessagesProvider.tsx'
import { NotificationBell } from '../notifications/NotificationBell.tsx'
import { NotificationPanelHost } from '../notifications/NotificationPanelHost.tsx'

export function AppShell() {
  const { profile } = useAuth()
  const suspended = profile?.status === 'suspended'

  return (
    <ModalStackProvider>
      <ToastProvider>
        <NotificationProvider>
        <MessagesProvider>
        <CreateSheetProvider>
          <div id={VOXLY_APP_ROOT_ID}>
            <SkipLink />
            <div className="pointer-events-none fixed left-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 md:hidden">
              <div className="pointer-events-auto">
                <NotificationBell variant="mobile" className="rounded-full border border-line bg-surface/95 shadow-md backdrop-blur" />
              </div>
            </div>
            <BottomNav />
            <NavRail />
            {suspended ? <SuspendedBanner suspendedUntil={profile?.suspended_until ?? null} /> : null}
            <WarningModal />
            <NotificationPanelHost />
            <main
              id="main"
              tabIndex={-1}
              className={`min-h-dvh overflow-x-hidden bg-bg text-ink pb-[calc(var(--nav-h)+1rem+env(safe-area-inset-bottom))] md:pb-8 md:pl-[var(--rail-width)] ${focusRing}`}
            >
              <Outlet />
            </main>
          </div>
        </CreateSheetProvider>
        </MessagesProvider>
        </NotificationProvider>
      </ToastProvider>
    </ModalStackProvider>
  )
}
