import { CreateTypePicker } from '../components/creations/CreateTypePicker.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function CreatePage() {
  useDocumentTitle('Create')

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8 pb-28">
      <PageHeader title="What will you share?" />
      <CreateTypePicker />
    </PageContainer>
  )
}
