import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import type { DictionaryResult } from '../../lib/reader/dictionaryClient.ts'
import { dictionarySearchUrl } from '../../lib/reader/dictionaryClient.ts'

type DictionaryLookupSheetProps = {
  open: boolean
  word: string
  result: DictionaryResult | null
  loading: boolean
  onClose: () => void
}

export function DictionaryLookupSheet({ open, word, result, loading, onClose }: DictionaryLookupSheetProps) {
  const titleId = 'dictionary-lookup-title'
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-full max-w-md rounded-2xl border border-line bg-surface p-4">
      <h2 id={titleId} className="font-serif text-xl text-ink">
        Look up
      </h2>
      <p className="mt-2 text-sm text-muted">{word}</p>
      {loading ? <p className="mt-4 text-sm text-ink">Loading definition…</p> : null}
      {!loading && result?.status === 'success' ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-muted">{result.entry.partOfSpeech}</p>
          <p className="mt-2 text-base text-ink">{result.entry.definition}</p>
        </div>
      ) : null}
      {!loading && result && result.status !== 'success' ? (
        <p className="mt-4 text-sm text-ink">
          {result.status === 'not-found'
            ? 'No definition found for this word.'
            : result.status === 'offline'
              ? 'You are offline. Connect to look up words.'
              : result.status === 'rate-limit'
                ? 'The dictionary is busy. Try again in a moment.'
                : 'Could not load a definition.'}
        </p>
      ) : null}
      <a
        href={dictionarySearchUrl(word)}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-4 inline-flex min-h-11 items-center text-sm font-medium text-coral ${focusRing}`}
      >
        Search the web
      </a>
      <button type="button" onClick={onClose} className={`mt-3 min-h-11 w-full rounded-xl border border-line text-sm ${focusRing}`}>
        Close
      </button>
    </Modal>
  )
}
