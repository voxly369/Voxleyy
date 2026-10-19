import { PageHeader } from '../components/shell/PageHeader.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'

export default function DiscoverPage() {
  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Discover" />
      <EmptyState
        icon={<ImageWithFallback alt="" label="Discover" />}
        title="Discover"
        message="Discover arrives in a later step."
      />
    </PageContainer>
  )
}
