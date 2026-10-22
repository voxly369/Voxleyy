import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { getOrCreateDm, searchDmWriters } from '../../lib/messages/api.ts'
import type { DmWriterHit } from '../../lib/messages/types.ts'

export function DmWriterSearch() {
  const navigate = useNavigate()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DmWriterHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 1) {
      setResults([])
      setError(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void searchDmWriters(trimmed).then((result) => {
        if (cancelled) return
        setLoading(false)
        if (!result.ok) {
          setError(result.error.message)
          setResults([])
          return
        }
        setResults(result.data)
      })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  async function openDm(writer: DmWriterHit) {
    if (!writer.canMessage || busyId) return
    setBusyId(writer.id)
    setError(null)
    const result = await getOrCreateDm(writer.id)
    setBusyId(null)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    navigate(`/messages/${result.data}`)
  }

  return (
    <div className="border-b border-line p-3" data-testid="dm-writer-search">
      <label htmlFor={inputId} className="sr-only">Search writers to message</label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search writers to message"
        data-testid="dm-writer-search-input"
        className={`min-h-11 w-full rounded-2xl border border-line bg-bg px-3 text-base ${focusRing}`}
      />
      {loading ? <p className="mt-2 text-sm text-muted">Searching…</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-coral">{error}</p>
      ) : null}
      {results.length > 0 ? (
        <ul className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-line" data-testid="dm-writer-results">
          {results.map((writer) => {
            const name = writer.displayName || writer.username
            const disabled = !writer.canMessage || busyId === writer.id
            return (
              <li key={writer.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  disabled={disabled}
                  data-testid="dm-writer-option"
                  onClick={() => void openDm(writer)}
                  className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left disabled:opacity-50 ${focusRing}`}
                >
                  <ImageWithFallback
                    src={writer.avatarUrl ?? undefined}
                    alt=""
                    label={name.charAt(0)}
                    className="size-9 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{name}</p>
                    <p className="truncate text-sm text-muted">@{writer.username}</p>
                  </div>
                  {!writer.canMessage ? (
                    <span className="text-xs text-muted">Cannot message</span>
                  ) : busyId === writer.id ? (
                    <span className="text-xs text-muted">Opening…</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
