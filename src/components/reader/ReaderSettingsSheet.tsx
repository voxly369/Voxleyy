import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import type { ReaderPreferences } from '../../lib/reader/readerPreferencesSchema.ts'
import type { ReaderBookmark, ReaderHighlight } from '../../lib/reader/highlightSchema.ts'

type ReaderSettingsSheetProps = {
  open: boolean
  prefs: ReaderPreferences
  onChange: (next: ReaderPreferences) => void
  onClose: () => void
  offlineSaved?: boolean
  offlineBusy?: boolean
  onOfflineSavedChange?: (enabled: boolean) => void
  highlights?: readonly ReaderHighlight[]
  bookmarks?: readonly ReaderBookmark[]
  onJumpToBookmark?: (paragraph: number, offset: number) => void
  onOpenHighlight?: (highlightId: string) => void
}

export function ReaderSettingsSheet({
  open,
  prefs,
  onChange,
  onClose,
  offlineSaved = false,
  offlineBusy = false,
  onOfflineSavedChange,
  highlights = [],
  bookmarks = [],
  onJumpToBookmark,
  onOpenHighlight,
}: ReaderSettingsSheetProps) {
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
        {onOfflineSavedChange ? (
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={offlineSaved}
              disabled={offlineBusy}
              onChange={(e) => onOfflineSavedChange(e.target.checked)}
            />
            Save offline on this device
          </label>
        ) : null}
        {bookmarks.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink">Bookmarks in this post</h3>
            <ul className="flex flex-col gap-1">
              {bookmarks.map((bookmark) => (
                <li key={bookmark.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToBookmark?.(bookmark.paragraph, bookmark.paragraphOffset)
                      onClose()
                    }}
                    className={`min-h-11 w-full rounded-lg px-2 text-left text-sm text-coral ${focusRing}`}
                  >
                    {bookmark.label?.trim() || `Paragraph ${bookmark.paragraph + 1}`}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {highlights.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink">Highlights in this post</h3>
            <ul className="flex flex-col gap-2">
              {highlights.map((highlight) => (
                <li key={highlight.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenHighlight?.(highlight.id)
                      onClose()
                    }}
                    className={`w-full rounded-lg border border-line px-2 py-2 text-left text-sm ${focusRing}`}
                  >
                    <span className="line-clamp-2 text-ink">{highlight.quote}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <button type="button" onClick={onClose} className={`mt-4 min-h-11 w-full rounded-xl bg-coral font-semibold text-[#1a100a] ${focusRing}`}>
        Done
      </button>
    </Modal>
  )
}
