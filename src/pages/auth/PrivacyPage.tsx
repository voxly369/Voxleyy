import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function PrivacyPage() {
  useDocumentTitle('Privacy')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl text-ink">Privacy</h1>
      <p className="text-base text-muted">The text arrives in a later step.</p>
    </div>
  )
}
