import { focusRing } from '../shell/navItems.ts'

export type MessagesSection = 'direct' | 'communities' | 'channels'

const TABS: { id: MessagesSection; label: string }[] = [
  { id: 'direct', label: 'Direct' },
  { id: 'communities', label: 'Communities' },
  { id: 'channels', label: 'Channels' },
]

type MessagesSectionTabsProps = {
  active: MessagesSection
  onChange: (tab: MessagesSection) => void
}

export function MessagesSectionTabs({ active, onChange }: MessagesSectionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Message sections"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid="messages-section-tabs"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          data-testid={`messages-tab-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize ${
            active === tab.id ? 'bg-coral text-[#1a100a]' : 'border border-line bg-surface text-ink'
          } ${focusRing}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
