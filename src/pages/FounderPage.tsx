import { PageHeader } from '../components/shell/PageHeader.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'

export default function FounderPage() {
  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Founder" />
      <EmptyState
        icon={<ImageWithFallback alt="" label="Founder" />}
        title="Founder"
        message="Founder tools arrive in a later step."
      />
    </PageContainer>
  )
}
