import type { ReactNode } from 'react'
import { PageContainer } from './PageContainer.tsx'
import { RightRail } from './RightRail.tsx'

type FeedWithRailLayoutProps = {
  children: ReactNode
}

/** Home / Following feed column with optional xl right rail. */
export function FeedWithRailLayout({ children }: FeedWithRailLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[calc(37.5rem+20rem+3rem)] justify-center gap-8 py-6 xl:max-w-none">
      <PageContainer variant="feed" className="min-w-0 flex-1 py-0">
        {children}
      </PageContainer>
      <div className="hidden shrink-0 xl:block">
        <div className="sticky top-6">
          <RightRail />
        </div>
      </div>
    </div>
  )
}
