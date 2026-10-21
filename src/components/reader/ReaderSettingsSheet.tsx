import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import type { ReaderPreferences } from '../../lib/reader/readerPreferencesSchema.ts'

type ReaderSettingsSheetProps = {
  open: boolean
  prefs: ReaderPreferences
  onChange: (next: ReaderPreferences) => void
  onClose: () => void
}

export function ReaderSettingsSheet({ open, prefs, onChange, onClose }: ReaderSettingsSheetProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="reader-settings-title"
      className="max-h-[min(85dvh,720px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 sm:rounded-2xl"
    >
      <h2 id="reader-settings-title" className="font-serif text-xl text-ink">
        Reading settings
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Text size</span>
          <input
            type="range"
            min={0}
            max={4}
            value={prefs.textSizeStep}
            onChange={(e) => onChange({ ...prefs, textSizeStep: Number(e.target.value) })}
            className="min-h-11"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Line spacing</span>
          <input
            type="range"
            min={100}
            max={250}
            value={Math.round(prefs.lineSpacing * 100)}
            onChange={(e) => onChange({ ...prefs, lineSpacing: Number(e.target.value) / 100 })}
            className="min-h-11"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Margins</span>
          <input
            type="range"
            min={0}
            max={4}
            value={prefs.marginStep}
            onChange={(e) => onChange({ ...prefs, marginStep: Number(e.target.value) })}
            className="min-h-11"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Brightness</span>
          <input
            type="range"
            min={50}
            max={150}
            value={Math.round(prefs.brightness * 100)}
            onChange={(e) => onChange({ ...prefs, brightness: Number(e.target.value) / 100 })}
            className="min-h-11"
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">Font</legend>
          {(
            [
              ['fraunces', 'Fraunces'],
              ['lora', 'Lora'],
              ['inter', 'Inter'],
              ['opendyslexic', 'OpenDyslexic'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="inline-flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="reader-font"
                checked={prefs.font === value}
                onChange={() => onChange({ ...prefs, font: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">Theme</legend>
          {(
            [
              ['paper', 'Paper'],
              ['sepia', 'Sepia'],
              ['dark', 'Dark'],
              ['black', 'Black'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="inline-flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="reader-theme"
                checked={prefs.theme === value}
                onChange={() => onChange({ ...prefs, theme: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.justify}
            onChange={(e) => onChange({ ...prefs, justify: e.target.checked })}
          />
          Justify text
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">Reading mode</legend>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="reader-mode"
              checked={prefs.mode === 'scroll'}
              onChange={() => onChange({ ...prefs, mode: 'scroll' })}
            />
            Continuous scroll
          </label>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="reader-mode"
              checked={prefs.mode === 'page'}
              onChange={() => onChange({ ...prefs, mode: 'page' })}
            />
            Page mode
          </label>
        </fieldset>
      </div>
      <button type="button" onClick={onClose} className={`mt-4 min-h-11 w-full rounded-xl bg-coral font-semibold text-[#1a100a] ${focusRing}`}>
        Done
      </button>
    </Modal>
  )
}
