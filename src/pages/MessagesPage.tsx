import { PageHeader } from '../components/shell/PageHeader.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'

export default function MessagesPage() {
  return (
    <PageContainer variant="feed" className="flex flex-col gap-6 py-8">
      <PageHeader title="Messages" />
      <EmptyState
        icon={<ImageWithFallback alt="" label="Messages" />}
        title="Messages"
        message="Messages arrives in a later step."
      />
    </PageContainer>
  )
}
