import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DISCOVER_GENRES, DISCOVER_MOODS } from '../../lib/discover/moodsAndGenres.ts'
import {
  fetchDailyWritingPrompt,
  listDiscoverPosts,
  listFeaturedWriters,
  listRisingWriters,
  type FeaturedWriter,
  type RisingWriter,
} from '../../lib/discover/listDiscover.ts'
import type { FeedPost } from '../../lib/feed/types.ts'
import { EmptyState } from '../states/EmptyState.tsx'
import { ErrorState } from '../states/ErrorState.tsx'
import { Skeleton } from '../states/Skeleton.tsx'
import { focusRing } from '../shell/navItems.ts'
import { HorizontalChipRow } from './HorizontalChipRow.tsx'
import { DiscoverPostStrip } from './DiscoverPostStrip.tsx'
import { DiscoverWriterCard } from './DiscoverWriterCard.tsx'

function SectionShell({
  title,
  children,
  testId,
}: {
  title: string
  children: React.ReactNode
  testId?: string
}) {
  return (
    <section className="flex flex-col gap-3" data-testid={testId} aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="font-serif text-xl text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function DiscoverExploreTab() {
  const navigate = useNavigate()
  const [featured, setFeatured] = useState<FeaturedWriter[] | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [trending, setTrending] = useState<FeedPost[]>([])
  const [fresh, setFresh] = useState<FeedPost[]>([])
  const [rising, setRising] = useState<RisingWriter[]>([])
  const [topPoems, setTopPoems] = useState<FeedPost[]>([])
  const [topStories, setTopStories] = useState<FeedPost[]>([])
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const [writers, daily, trend, newest, voices, poems, stories] = await Promise.all([
        listFeaturedWriters(),
        fetchDailyWritingPrompt(),
        listDiscoverPosts('trending', {}, null),
        listDiscoverPosts('new', {}, null),
        listRisingWriters(),
        listDiscoverPosts('top_week_poem', {}, null),
        listDiscoverPosts('top_week_story', {}, null),
      ])
      if (!active) return
      if (writers.ok) setFeatured(writers.data)
      if (daily.ok) setPrompt(daily.prompt)
      if (trend.ok) setTrending(trend.data.posts)
      else setProblem(trend.error.message)
      if (newest.ok) setFresh(newest.data.posts)
      if (voices.ok) setRising(voices.data)
      if (poems.ok) setTopPoems(poems.data.posts)
      if (stories.ok) setTopStories(stories.data.posts)
    })()
    return () => {
      active = false
    }
  }, [])

  function onPostUpdate(postId: string, patch: Partial<FeedPost>) {
    const apply = (list: FeedPost[]) => list.map((p) => (p.id === postId ? { ...p, ...patch } : p))
    setTrending((prev) => apply(prev))
    setFresh((prev) => apply(prev))
    setTopPoems((prev) => apply(prev))
    setTopStories((prev) => apply(prev))
  }

  if (problem) {
    return <ErrorState title="Discover did not load" message={problem} onRetry={() => window.location.reload()} />
  }

  return (
    <div className="flex flex-col gap-10">
      <SectionShell title="Spoken Word of the Day" testId="discover-spoken-word">
        <EmptyState
          title="No recitations yet"
          message="When writers publish recitation videos, the top piece from the last day will appear here."
        />
      </SectionShell>

      <SectionShell title="Featured Writers" testId="discover-featured-writers">
        {featured === null ? (
          <Skeleton variant="text-lines" lines={2} />
        ) : featured.length === 0 ? (
          <EmptyState title="No featured writers yet" message="The Founder has not curated featured writers." />
        ) : (
          <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
            {featured.map((writer) => (
              <DiscoverWriterCard
                key={writer.writerId}
                variant="featured"
                writer={{
                  id: writer.writerId,
                  username: writer.username,
                  displayName: writer.displayName,
                  avatarUrl: writer.avatarUrl,
                  verified: writer.verified,
                  country: writer.country,
                }}
              />
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell title="Word of the Day" testId="discover-word-of-day">
        {prompt === null ? (
          <Skeleton variant="text-lines" lines={2} />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-serif text-lg text-ink">{prompt}</p>
            <button
              type="button"
              onClick={() => navigate('/create/new/written_post', { state: { seedBody: prompt } })}
              className={`mt-4 min-h-11 rounded-2xl bg-coral px-4 text-sm font-semibold text-white ${focusRing}`}
            >
              Write now
            </button>
          </div>
        )}
      </SectionShell>

      <SectionShell title="Countries" testId="discover-browse-countries">
        <Link
          to="/discover/countries"
          className={`inline-flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink ${focusRing}`}
          data-testid="discover-browse-countries-link"
        >
          Browse countries
        </Link>
      </SectionShell>

      <HorizontalChipRow
        title="Browse by Mood"
        chips={DISCOVER_MOODS.map((m) => ({ slug: m.slug, label: m.label, kind: 'mood' }))}
      />
      <HorizontalChipRow
        title="Browse by Genre"
        chips={DISCOVER_GENRES.map((g) => ({ slug: g.slug, label: g.label, kind: 'genre' }))}
      />

      <SectionShell title="Trending" testId="discover-trending">
        {trending.length === 0 ? <Skeleton variant="text-lines" lines={3} /> : null}
        <DiscoverPostStrip posts={trending} onPostUpdate={onPostUpdate} />
        <Link
          to="/discover/browse?sort=trending"
          className={`inline-flex min-h-11 items-center text-sm font-medium text-coral ${focusRing}`}
        >
          See all trending
        </Link>
      </SectionShell>

      <SectionShell title="New" testId="discover-new">
        <DiscoverPostStrip posts={fresh} onPostUpdate={onPostUpdate} />
        <Link
          to="/discover/browse?sort=new"
          className={`inline-flex min-h-11 items-center text-sm font-medium text-coral ${focusRing}`}
        >
          See all new work
        </Link>
      </SectionShell>

      <SectionShell title="Rising Voices" testId="discover-rising-voices">
        {rising.length === 0 ? (
          <EmptyState title="No rising voices yet" message="Writers gaining momentum will appear here." />
        ) : (
          <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
            {rising.map((writer) => (
              <DiscoverWriterCard
                key={writer.id}
                variant="rising"
                countryLinkTestId="discover-rising-writer-country-link"
                writer={{
                  id: writer.id,
                  username: writer.username,
                  displayName: writer.displayName,
                  verified: writer.verified,
                  country: writer.country,
                }}
              />
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell title="Top Poems this week" testId="discover-top-poems">
        <DiscoverPostStrip posts={topPoems} onPostUpdate={onPostUpdate} />
      </SectionShell>

      <SectionShell title="Top Stories this week" testId="discover-top-stories">
        <DiscoverPostStrip posts={topStories} onPostUpdate={onPostUpdate} />
      </SectionShell>

      <SectionShell title="Trending Sounds" testId="discover-trending-sounds">
        <EmptyState title="No trending sounds yet" message="When backing tracks spread across the platform, they will show up here." />
      </SectionShell>

      <SectionShell title="Trending Challenges" testId="discover-trending-challenges">
        <EmptyState title="No active challenges" message="Writing challenges will appear here when they launch." />
      </SectionShell>
    </div>
  )
}
