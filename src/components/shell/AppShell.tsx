import { Outlet } from 'react-router-dom'
import { CreateSheetProvider } from '../../lib/shell/CreateSheetProvider.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { VOXLY_APP_ROOT_ID } from '../../lib/shell/modalStackContext.ts'
import { BottomNav } from './BottomNav.tsx'
import { SideNav } from './SideNav.tsx'
import { SkipLink } from './SkipLink.tsx'
import { ToastProvider } from './ToastProvider.tsx'
import { focusRing } from './navItems.ts'

export function AppShell() {
  return (
    <ModalStackProvider>
      <ToastProvider>
        <CreateSheetProvider>
          <div id={VOXLY_APP_ROOT_ID}>
            <SkipLink />
            <BottomNav />
            <SideNav />
            <main
              id="main"
              tabIndex={-1}
              className={`min-h-screen bg-bg text-ink pb-[calc(var(--nav-h)+1rem+env(safe-area-inset-bottom))] lg:pb-8 lg:pl-64 ${focusRing}`}
            >
              <Outlet />
            </main>
          </div>
        </CreateSheetProvider>
      </ToastProvider>
    </ModalStackProvider>
  )
}
