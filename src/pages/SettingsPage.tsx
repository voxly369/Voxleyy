import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'
import { useTheme } from '../lib/useTheme.ts'
import type { ThemeChoice } from '../lib/theme.ts'

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function SettingsPage() {
  const { choice, setTheme } = useTheme()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <PageHeader title="Settings" />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="theme-label" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Dark or light mode
        </h2>
        <div role="radiogroup" aria-labelledby="theme-label" className="mt-4 grid grid-cols-3 gap-2">
          {themeOptions.map((option) => {
            const selected = choice === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={`min-h-11 rounded-2xl px-2 text-sm ${selected ? 'bg-raised font-semibold text-ink ring-1 ring-line' : 'font-medium text-muted'} ${focusRing}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </section>
      <EmptyState
        icon={<ImageWithFallback alt="" label="Settings" />}
        title="Settings"
        message="The rest of Settings arrives in a later step."
      />
    </div>
  )
}
