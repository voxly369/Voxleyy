import { Link } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'

export default function NotFoundPage() {
  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Page not found" />
      <EmptyState
        icon={<ImageWithFallback alt="" label="Voxly" />}
        title="This page is not here"
        message="That address does not match a Voxly screen."
        action={
          <Link
            to="/"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
          >
            Go to Home
          </Link>
        }
      />
    </PageContainer>
  )
}
