import { AUDIENCE_OPTIONS } from '../../lib/creations/audienceOptions.ts'
import type { Audience } from '../../lib/creations/types.ts'
import { focusRing } from '../shell/navItems.ts'

type AudienceSelectorProps = {
  value: Audience
  onChange: (audience: Audience) => void
}

export function AudienceSelector({ value, onChange }: AudienceSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-ink">Audience</legend>
      <div className="flex flex-col gap-2">
        {AUDIENCE_OPTIONS.map((option) => (
          <label key={option.value} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-line p-3 ${focusRing}`}>
            <input
              type="radio"
              name="editor-audience"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 size-4 accent-coral"
            />
            <span>
              <span className="block font-medium text-ink">{option.label}</span>
              <span className="block text-sm text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
