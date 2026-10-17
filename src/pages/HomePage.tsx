import { PageHeader } from '../components/shell/PageHeader.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <PageHeader title="Home" />
      <EmptyState
        icon={<ImageWithFallback alt="" label="Home" />}
        title="Home"
        message="Home arrives in a later step."
      />
    </div>
  )
}
