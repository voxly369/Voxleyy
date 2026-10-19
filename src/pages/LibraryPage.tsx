import { Link } from 'react-router-dom'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function LibraryPage() {
  useDocumentTitle('Library')
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <PageHeader title="Library" />
      <nav className="flex flex-col gap-3">
        <Link
          to="/library/saved"
          className={`flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink ${focusRing}`}
        >
          Saved
        </Link>
        <Link
          to="/write/drafts"
          className={`flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink ${focusRing}`}
        >
          Drafts
        </Link>
      </nav>
    </div>
  )
}
