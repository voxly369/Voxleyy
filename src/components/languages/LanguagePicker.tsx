import { useId, useMemo, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { LANGUAGES_LIST } from '../../lib/languages/languagesList.generated.ts'
import { languageDisplayName } from '../../lib/languages/languageName.ts'

type LanguagePickerProps = {
  id?: string
  label?: string
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  testId?: string
}

export function LanguagePicker({
  id: idProp,
  label = 'Language',
  value,
  onChange,
  disabled = false,
  testId = 'language-picker',
}: LanguagePickerProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [query, setQuery] = useState('')
  const normalized = value.trim().toLowerCase()

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = LANGUAGES_LIST.filter((entry) => {
      if (!q) return true
      return (
        entry.code.includes(q) ||
        entry.nameEn.toLowerCase().includes(q) ||
        entry.nameNative.toLowerCase().includes(q)
      )
    })
    if (normalized && !list.some((entry) => entry.code === normalized)) {
      return [
        { code: normalized, nameEn: languageDisplayName(normalized), nameNative: languageDisplayName(normalized) },
        ...list,
      ]
    }
    return list
  }, [query, normalized])

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <label htmlFor={`${id}-search`} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={`${id}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search languages"
        disabled={disabled}
        className={`min-h-11 rounded-2xl border border-line bg-surface px-3 text-base text-ink ${focusRing}`}
        data-testid={`${testId}-search`}
      />
      <select
        id={id}
        value={normalized || 'en'}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        size={Math.min(8, Math.max(4, options.length))}
        className={`rounded-2xl border border-line bg-surface px-3 py-2 text-base text-ink ${focusRing}`}
        data-testid={`${testId}-select`}
      >
        {options.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.nameNative} ({entry.code})
          </option>
        ))}
      </select>
    </div>
  )
}
