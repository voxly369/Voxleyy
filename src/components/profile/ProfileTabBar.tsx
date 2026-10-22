import type { KeyboardEvent } from 'react'
import type { ProfileTabDef, ProfileTabId } from '../../lib/profiles/profileTabs.ts'
import { focusRing } from '../shell/navItems.ts'

type ProfileTabBarProps = {
  tabs: readonly ProfileTabDef[]
  active: ProfileTabId
  onChange: (tab: ProfileTabId) => void
}

export function ProfileTabBar({ tabs, active, onChange }: ProfileTabBarProps) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((tab) => tab.id === active)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onChange(tabs[(index + 1) % tabs.length].id)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onChange(tabs[(index - 1 + tabs.length) % tabs.length].id)
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Profile"
      className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto border-b border-line px-4 pb-px md:mx-0 md:px-0"
      data-testid="profile-tab-bar"
    >
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`tab-${item.id}`}
          aria-selected={active === item.id}
          aria-controls={`panel-${item.id}`}
          tabIndex={active === item.id ? 0 : -1}
          onKeyDown={onKeyDown}
          onClick={() => onChange(item.id)}
          className={`min-h-11 shrink-0 px-4 text-base ${active === item.id ? 'border-b-2 border-coral font-semibold text-ink' : 'font-medium text-muted'} ${focusRing}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
