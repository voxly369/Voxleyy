import { focusRing } from './navItems.ts'
import type { ThemeChoice } from '../../lib/theme.ts'

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

type ThemeChoiceGroupProps = {
  choice: ThemeChoice
  onChange: (choice: ThemeChoice) => void
  labelledBy: string
  compact?: boolean
}

export function ThemeChoiceGroup({ choice, onChange, labelledBy, compact }: ThemeChoiceGroupProps) {
  return (
    <div
      role={compact ? 'group' : 'radiogroup'}
      aria-labelledby={labelledBy}
      className={compact ? 'grid grid-cols-3 gap-1' : 'mt-4 grid grid-cols-3 gap-2'}
    >
      {themeOptions.map((option) => {
        const selected = choice === option.value
        return (
          <button
            key={option.value}
            type="button"
            role={compact ? 'menuitemradio' : 'radio'}
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-2xl px-2 text-sm ${selected ? 'bg-raised font-semibold text-ink ring-1 ring-line' : 'font-medium text-muted'} ${focusRing}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
