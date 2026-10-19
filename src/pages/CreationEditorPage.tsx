import { useParams } from 'react-router-dom'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { parseCreationType } from '../lib/creations/creationTypes.ts'
import NotFoundPage from './NotFoundPage.tsx'

/** Item 2 replaces this shell with the full editor. */
export default function CreationEditorPage() {
  const { type, id } = useParams()
  const creationType = type ? parseCreationType(type) : null
  if (type && !creationType) return <NotFoundPage />
  if (id && !type) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <PageHeader title="Edit draft" />
        <p className="text-muted">Editor loading for {id}…</p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <PageHeader title="New draft" />
      <p className="text-muted">Editor for {creationType}…</p>
    </div>
  )
}
