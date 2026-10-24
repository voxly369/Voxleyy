import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { LEGAL_DOCUMENT_VERSIONS, type LegalDocumentKey } from '../../config/organization.ts'
import { recordUserConsents } from '../../lib/consent/recordConsent.ts'
import { focusRing } from '../shell/navItems.ts'
import { Modal } from '../shell/Modal.tsx'

type ConsentReacceptModalProps = {
  open: boolean
  documents: LegalDocumentKey[]
  busy?: boolean
  onAccepted: () => void
}

const LABELS: Record<LegalDocumentKey, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  community: 'Community Guidelines',
  copyright: 'Copyright Policy',
}

export function ConsentReacceptModal({ open, documents, busy = false, onAccepted }: ConsentReacceptModalProps) {
  const titleId = useId()
  const descId = useId()
  const [accepted, setAccepted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit() {
    if (!accepted || pending || documents.length === 0) return
    setPending(true)
    setError('')
    const result = await recordUserConsents(
      documents.map((document) => ({ document, version: LEGAL_DOCUMENT_VERSIONS[document] })),
    )
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onAccepted()
  }

  return (
    <Modal
      open={open}
      onClose={() => {}}
      closeOnEscape={false}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descId}
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
    >
      <div data-testid="consent-reaccept-modal">
        <h2 id={titleId} className="font-serif text-xl text-ink">
          Updated legal terms
        </h2>
        <p id={descId} className="mt-2 text-sm text-muted">
          We updated our legal documents. Review and accept to keep using Voxly. You can still visit Settings to export
          or delete your account.
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-ink">
          {documents.map((document) => (
            <li key={document}>
              <Link
                to={document === 'terms' ? '/terms' : document === 'privacy' ? '/privacy' : '/community-guidelines'}
                className={`text-coral underline ${focusRing}`}
              >
                {LABELS[document]}
              </Link>{' '}
              (version {LEGAL_DOCUMENT_VERSIONS[document]})
            </li>
          ))}
        </ul>
        <label className="mt-4 flex min-h-11 items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className={`mt-1 size-5 accent-coral ${focusRing}`}
            data-testid="consent-reaccept-checkbox"
          />
          <span>I have read and accept the updated documents listed above.</span>
        </label>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-coral">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!accepted || pending || busy}
          onClick={() => void onSubmit()}
          className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-coral px-4 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
          data-testid="consent-reaccept-submit"
        >
          {pending ? 'Saving…' : 'Accept and continue'}
        </button>
      </div>
    </Modal>
  )
}
