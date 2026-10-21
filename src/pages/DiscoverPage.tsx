import { useState } from 'react'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { FeedWithRailLayout } from '../components/shell/FeedWithRailLayout.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { DiscoverSearchField } from '../components/discover/DiscoverSearchField.tsx'
import { DiscoverExploreTab } from '../components/discover/DiscoverExploreTab.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

type DiscoverTab = 'explore' | 'communities' | 'slam' | 'live'

const TABS: { id: DiscoverTab; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'communities', label: 'Communities' },
  { id: 'slam', label: 'Slam' },
  { id: 'live', label: 'Live' },
]

export default function DiscoverPage() {
  useDocumentTitle('Discover')
  const [tab, setTab] = useState<DiscoverTab>('explore')

  return (
    <FeedWithRailLayout>
      <PageContainer variant="wide" className="flex flex-col gap-6 py-6 md:py-8">
        <PageHeader title="Discover" />
        <DiscoverSearchField className="w-full" />
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Discover sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${
                tab === item.id ? 'bg-coral text-white' : 'bg-surface text-muted border border-line'
              } ${focusRing}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'explore' ? <DiscoverExploreTab /> : null}
        {tab === 'communities' ? (
          <EmptyState
            title="Communities"
            message="Create the first community"
            action={
              <span className="text-sm text-muted">Community creation arrives in a later step.</span>
            }
          />
        ) : null}
        {tab === 'slam' ? (
          <EmptyState
            title="Slam"
            message="Learn how Slam works"
            action={<span className="text-sm text-muted">Slam events arrive in a later step.</span>}
          />
        ) : null}
        {tab === 'live' ? (
          <EmptyState
            title="Live"
            message="Notify me when someone goes live"
            action={<span className="text-sm text-muted">Live rooms arrive in a later step.</span>}
          />
        ) : null}
      </PageContainer>
    </FeedWithRailLayout>
  )
}
