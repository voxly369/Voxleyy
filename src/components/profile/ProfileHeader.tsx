import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { countryFlag, countryName } from '../../lib/profiles/countries.ts'
import type { PublicProfile } from '../../lib/profiles/types.ts'
import { MenuLinesIcon } from '../icons/MenuLinesIcon.tsx'
import { CountLink, SafeWebsite } from './SafeWebsite.tsx'
import { FollowButton } from './FollowButton.tsx'
import { VerifiedBadge } from './VerifiedBadge.tsx'

type ProfileHeaderProps = {
  profile: PublicProfile
  isOwn: boolean
  following: boolean
  followerCount: number
  onFollowingChange: (following: boolean) => void
}

export function ProfileHeader({ profile, isOwn, following, followerCount, onFollowingChange }: ProfileHeaderProps) {
  const name = profile.displayName || profile.username
  const country = countryName(profile.country)
  const flag = countryFlag(profile.country)

  return (
    <header className="flex flex-col">
      <div className="relative">
        {isOwn ? (
          <Link
            to="/settings"
            aria-label="Settings and activity"
            data-testid="profile-settings-button"
            className={`absolute right-5 top-5 z-20 inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-surface/95 text-ink backdrop-blur md:hidden ${focusRing}`}
          >
            <MenuLinesIcon className="size-6" />
          </Link>
        ) : null}
        <ImageWithFallback
          src={profile.bannerUrl ?? undefined}
          alt=""
          label={name}
          className="!h-40 !max-h-56 !w-full !rounded-none !size-auto sm:!h-56"
        />
        <div className="absolute bottom-0 left-5 translate-y-1/2">
          <ImageWithFallback
            src={profile.avatarUrl ?? undefined}
            alt={`${name} avatar`}
            label={name}
            className="!size-24 border-4 border-bg"
          />
        </div>
      </div>
      <div className="mt-14 flex flex-col gap-3 px-5 lg:mt-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-4xl text-ink">{name}</h1>
          {profile.verified ? <VerifiedBadge /> : null}
          {profile.role === 'writer' ? (
            <span className="rounded-full bg-raised px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Writer
            </span>
          ) : null}
        </div>
        <p className="text-base text-muted">@{profile.username}</p>
        {profile.bio ? <p className="whitespace-pre-wrap text-base text-ink">{profile.bio}</p> : null}
        {country ? (
          <p className="text-sm text-muted">
            <span aria-hidden="true">{flag} </span>
            {country}
          </p>
        ) : null}
        {profile.cityVisible && profile.city ? <p className="text-sm text-muted">{profile.city}</p> : null}
        <SafeWebsite value={profile.website} />
        {isOwn ? (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/settings/profile"
              className={`inline-flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink ${focusRing}`}
            >
              Edit profile
            </Link>
            <Link
              to="/library"
              className={`inline-flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink ${focusRing}`}
            >
              Library
            </Link>
          </div>
        ) : (
          <div className="lg:hidden">
            <FollowButton
              userId={profile.id}
              username={profile.username}
              following={following}
              onChange={onFollowingChange}
            />
          </div>
        )}
        </div>
        <div className="flex shrink-0 flex-col gap-3 lg:items-end lg:text-right">
        <div className="flex flex-nowrap gap-3 overflow-x-auto lg:justify-end" aria-live="polite">
          <CountLink to={`/u/${profile.username}/followers`} count={followerCount} noun="follower" />
          <CountLink to={`/u/${profile.username}/following`} count={profile.followingCount} noun="following" />
          <CountLink count={profile.creationCount} noun="work" />
        </div>
        {!isOwn ? (
          <div className="hidden lg:block">
            <FollowButton
              userId={profile.id}
              username={profile.username}
              following={following}
              onChange={onFollowingChange}
            />
          </div>
        ) : null}
        </div>
      </div>
    </header>
  )
}
