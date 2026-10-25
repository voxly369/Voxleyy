import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { FeedWithRailLayout } from '../components/shell/FeedWithRailLayout.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { LocalTime } from '../components/time/LocalTime.tsx'
import { DiscoverPostStrip } from '../components/discover/DiscoverPostStrip.tsx'
import { DiscoverFollowButton } from '../components/discover/DiscoverFollowButton.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { countryFlag } from '../lib/profiles/countries.ts'
import {
  fetchCountryPage,
  listCountryRisingWriters,
  listCountryTrending,
  type CountryPageMeta,
  type CountryRisingWriter,
} from '../lib/country/api.ts'
import { languageNativeName } from '../lib/country/languageNames.ts'
import type { FeedPost } from '../lib/feed/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { useAuth } from '../lib/auth/auth-context.ts'

const CODE_PATTERN = /^[A-Z]{2}$/

export default function CountryPage() {
  const { profile } = useAuth()
  const { code = '' } = useParams()
  const normalized = code.trim().toUpperCase()
  const valid = CODE_PATTERN.test(normalized)

  const [meta, setMeta] = useState<CountryPageMeta | null>(null)
  const [trending, setTrending] = useState<FeedPost[]>([])
  const [rising, setRising] = useState<CountryRisingWriter[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle(meta?.name ?? (valid ? normalized : 'Country'))

  useEffect(() => {
    if (!valid) return
    let active = true
    setLoading(true)
    void (async () => {
      const [page, voices, trend] = await Promise.all([
        fetchCountryPage(normalized),
        listCountryRisingWriters(normalized),
        listCountryTrending(normalized, null),
      ])
      if (!active) return
      setLoading(false)
      if (!page.ok) {
        setError(page.message)
        return
      }
      setError(null)
      setMeta(page.data)
      if (voices.ok) setRising(voices.data)
      if (trend.ok) {
        setTrending(trend.posts)
        setCursor(trend.nextCursor)
      }
    })()
    return () => {
      active = false
    }
  }, [normalized, valid])

  if (!valid) {
    return (
      <PageContainer variant="wide" className="py-8">
        <EmptyState title="Country not found" message="Use a two-letter country code." />
      </PageContainer>
    )
  }

  function onPostUpdate(postId: string, patch: Partial<FeedPost>) {
    setTrending((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)))
  }

  return (
    <FeedWithRailLayout>
      <PageContainer variant="wide" className="flex flex-col gap-8 py-8" testId="country-page">
        {loading ? <Skeleton variant="text-lines" lines={4} data-testid="country-page-loading" /> : null}
        {error ? <ErrorState title="Country did not load" message={error} onRetry={() => window.location.reload()} /> : null}
        {!loading && !error && meta ? (
          <>
            <header className="flex flex-col gap-3">
              <PageHeader title={`${countryFlag(meta.code)} ${meta.name}`} />
              {meta.primaryTimezone && profile?.show_local_time ? (
                <LocalTime timezone={meta.primaryTimezone} testId="country-local-time" />
              ) : meta.primaryTimezone && !profile?.show_local_time ? null : (
                <p className="text-sm text-muted">Local time varies across this country.</p>
              )}
              {meta.mainLanguages.length > 0 ? (
                <p className="text-sm text-muted">
                  Languages:{' '}
                  {meta.mainLanguages.map((lang) => languageNativeName(lang)).join(', ')}
                </p>
              ) : null}
              <p className="text-sm text-muted">
                {meta.writerCount} active {meta.writerCount === 1 ? 'writer' : 'writers'} · {meta.postCount} public{' '}
                {meta.postCount === 1 ? 'post' : 'posts'}
              </p>
            </header>

            <section className="flex flex-col gap-3" data-testid="country-trending">
              <h2 className="font-serif text-xl text-ink">Trending from {meta.name}</h2>
              {trending.length === 0 ? (
                <EmptyState title="No public posts yet" message="When writers from here publish, their work will show up." />
              ) : (
                <DiscoverPostStrip posts={trending} layout="grid" onPostUpdate={onPostUpdate} />
              )}
              {cursor ? (
                <button
                  type="button"
                  className={`min-h-11 self-center rounded-2xl border border-line px-4 ${focusRing}`}
                  onClick={() =>
                    void listCountryTrending(normalized, cursor).then((result) => {
                      if (!result.ok) return
                      setTrending((prev) => [...prev, ...result.posts])
                      setCursor(result.nextCursor)
                    })
                  }
                >
                  Load more
                </button>
              ) : null}
            </section>

            {meta.writerCount === 0 && rising.length === 0 ? (
              <EmptyState
                title="No writers from here yet"
                message="When writers list this country on their profile, they will show up here."
                dataTestId="country-no-writers"
              />
            ) : null}

            {rising.length > 0 ? (
              <section className="flex flex-col gap-3" data-testid="country-rising-writers">
                <h2 className="font-serif text-xl text-ink">Rising writers</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {rising.map((writer) => (
                    <li
                      key={writer.id}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
                    >
                      <Link to={`/u/${writer.username}`} className={focusRing}>
                        <ImageWithFallback
                          src={writer.avatarUrl ?? undefined}
                          alt=""
                          label={writer.displayName}
                          className="!size-12"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/u/${writer.username}`} className={`font-semibold text-ink ${focusRing}`}>
                          {writer.displayName}
                        </Link>
                        <p className="text-sm text-muted">@{writer.username}</p>
                      </div>
                      <DiscoverFollowButton userId={writer.id} username={writer.username} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2" data-testid="country-coming-soon">
              <article className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="font-serif text-lg text-ink">Communities</h3>
                <p className="mt-2 text-sm text-muted">
                  Communities and featured work from this country appear when they launch.
                </p>
              </article>
              <article className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="font-serif text-lg text-ink">Featured work</h3>
                <p className="mt-2 text-sm text-muted">
                  Curated highlights from {meta.name} will live here once community features ship.
                </p>
              </article>
            </section>
          </>
        ) : null}
      </PageContainer>
    </FeedWithRailLayout>
  )
}
