import { focusRing } from '../shell/navItems.ts'

export type FeedTab = 'home' | 'for_you' | 'following'

type FeedSwitcherProps = {
  active: FeedTab
  onChange: (tab: FeedTab) => void
}

const tabs: { id: FeedTab; label: string; disabled?: boolean; hint?: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'for_you', label: 'For You', disabled: true, hint: 'Coming soon' },
  { id: 'following', label: 'Following' },
]

export function FeedSwitcher({ active, onChange }: FeedSwitcherProps) {
  return (
    <div className="flex gap-2 rounded-2xl border border-line bg-surface p-1" role="tablist" aria-label="Feed">
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={tab.disabled}
            title={tab.hint}
            onClick={() => {
              if (!tab.disabled) onChange(tab.id)
            }}
            className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold transition ${
              selected ? 'bg-coral text-white' : 'text-muted'
            } disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          >
            {tab.label}
            {tab.disabled ? <span className="sr-only"> ({tab.hint})</span> : null}
          </button>
        )
      })}
    </div>
  )
}
