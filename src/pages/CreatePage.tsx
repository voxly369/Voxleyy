import { CreateTypePicker } from '../components/creations/CreateTypePicker.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function CreatePage() {
  useDocumentTitle('Create')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 pb-28">
      <PageHeader title="What will you share?" />
      <CreateTypePicker />
    </div>
  )
}
