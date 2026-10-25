import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { DisplayNameWithMarks } from '../profile/DisplayNameWithMarks.tsx'
import { CountryLink } from '../country/CountryLink.tsx'
import { DiscoverFollowButton } from './DiscoverFollowButton.tsx'

export type DiscoverWriterCardWriter = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  verified?: boolean
  country?: string | null
}

type DiscoverWriterCardProps = {
  writer: DiscoverWriterCardWriter
  variant: 'featured' | 'rising'
  countryLinkTestId?: string
}

/** Profile + country links are siblings (no nested interactive elements). */
export function DiscoverWriterCard({ writer, variant, countryLinkTestId }: DiscoverWriterCardProps) {
  const name = writer.displayName || writer.username
  const profilePath = `/u/${writer.username}`

  if (variant === 'featured') {
    return (
      <article
        className="flex w-64 shrink-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
        data-testid="discover-writer-card"
      >
        <div className="flex items-start gap-3">
          <Link
            to={profilePath}
            aria-label={`View ${name}'s profile`}
            className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center ${focusRing}`}
          >
            <ImageWithFallback
              src={writer.avatarUrl ?? undefined}
              alt=""
              label={name.charAt(0) || writer.username.charAt(0)}
              className="size-12 rounded-full"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={profilePath}
              className={`flex min-h-11 w-full min-w-11 items-center ${focusRing}`}
              data-testid="discover-writer-profile-link"
            >
              <DisplayNameWithMarks name={name} verified={writer.verified} nameClassName="font-medium text-ink" />
            </Link>
            <p className="truncate text-sm text-muted">@{writer.username}</p>
            {writer.country ? <CountryLink code={writer.country} className="mt-1" /> : null}
          </div>
        </div>
        <DiscoverFollowButton userId={writer.id} username={writer.username} />
      </article>
    )
  }

  return (
    <article
      className="w-56 shrink-0 rounded-2xl border border-line bg-surface p-4"
      data-testid="discover-writer-card"
    >
      <Link
        to={profilePath}
        className={`flex min-h-11 w-full min-w-11 flex-col justify-center ${focusRing}`}
        data-testid="discover-writer-profile-link"
      >
        <DisplayNameWithMarks name={name} verified={writer.verified} nameClassName="font-medium text-ink" />
        <span className="text-sm text-muted">@{writer.username}</span>
      </Link>
      {writer.country ? (
        <CountryLink code={writer.country} className="mt-1" testId={countryLinkTestId} />
      ) : null}
      <DiscoverFollowButton userId={writer.id} username={writer.username} />
    </article>
  )
}
