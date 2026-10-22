import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { listBlocks, unblockUser } from '../../lib/safety/blocksApi.ts'
import { addHiddenWord, listHiddenWords, removeHiddenWord } from '../../lib/safety/hiddenWordsApi.ts'
import { listMutes, unmuteUser } from '../../lib/safety/mutesApi.ts'
import type { BlockRow, HiddenWordRow, MuteRow } from '../../lib/safety/types.ts'
import { MessagePrivacySettings } from '../messages/MessagePrivacySettings.tsx'

export function SafetySettingsSection() {
  const [blocks, setBlocks] = useState<BlockRow[]>([])
  const [mutes, setMutes] = useState<MuteRow[]>([])
  const [words, setWords] = useState<HiddenWordRow[]>([])
  const [wordInput, setWordInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    const [b, m, w] = await Promise.all([listBlocks(), listMutes(), listHiddenWords()])
    setLoading(false)
    if (b.ok) setBlocks(b.data)
    if (m.ok) setMutes(m.data)
    if (w.ok) setWords(w.data)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onAddWord(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const result = await addHiddenWord(wordInput)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setWordInput('')
    void reload()
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" data-testid="safety-settings">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Safety</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/settings/reports"
          className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
        >
          My reports
        </Link>
        <Link
          to="/settings/appeals"
          className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
        >
          Appeals
        </Link>
      </div>

      <MessagePrivacySettings />

      <h3 className="mt-6 text-sm font-semibold text-ink">Blocked accounts</h3>
      {loading ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : blocks.length === 0 ? (
        <p className="mt-2 text-sm text-muted">You have not blocked anyone.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {blocks.map((row) => (
            <li key={row.blockedId} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
              <span className="text-sm text-ink">@{row.username}</span>
              <button
                type="button"
                onClick={() => void unblockUser(row.blockedId).then(() => reload())}
                className={`text-sm font-medium text-coral ${focusRing}`}
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-ink">Muted accounts</h3>
      {mutes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">You have not muted anyone.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {mutes.map((row) => (
            <li key={row.mutedUserId} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
              <span className="text-sm text-ink">@{row.username}</span>
              <button
                type="button"
                onClick={() => void unmuteUser(row.mutedUserId).then(() => reload())}
                className={`text-sm font-medium text-coral ${focusRing}`}
              >
                Unmute
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-ink">Hidden words</h3>
      <form onSubmit={(e) => void onAddWord(e)} className="mt-2 flex flex-wrap gap-2">
        <input
          value={wordInput}
          onChange={(event) => setWordInput(event.target.value)}
          placeholder="Add a word"
          className="min-h-11 flex-1 rounded-2xl border border-line bg-bg px-3 text-base"
          maxLength={40}
        />
        <button
          type="submit"
          className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white ${focusRing}`}
        >
          Add
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-coral">
          {error}
        </p>
      ) : null}
      {words.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No hidden words yet.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {words.map((row) => (
            <li key={row.word}>
              <button
                type="button"
                onClick={() => void removeHiddenWord(row.word).then(() => reload())}
                className={`rounded-full bg-bg px-3 py-1 text-sm text-ink ${focusRing}`}
              >
                {row.word} ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
