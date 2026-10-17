import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav.tsx'
import { SideNav } from './SideNav.tsx'
import { SkipLink } from './SkipLink.tsx'
import { focusRing } from './navItems.ts'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <BottomNav />
      <SideNav />
      <main
        id="main"
        tabIndex={-1}
        className={`min-h-screen bg-bg text-ink pb-[calc(var(--nav-h)+1rem+env(safe-area-inset-bottom))] lg:pb-8 lg:pl-64 ${focusRing}`}
      >
        {children}
      </main>
    </>
  )
}
