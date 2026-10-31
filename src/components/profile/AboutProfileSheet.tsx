import { useId } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { aboutProfileCopy } from '../../config/aboutProfileCopy.ts'
import { countryFlag, countryName } from '../../lib/profiles/countries.ts'
import type { PublicProfile } from '../../lib/profiles/types.ts'
import { showsVerifiedSeal } from '../../lib/profiles/showsVerifiedSeal.ts'
import { VerifiedSeal } from './VerifiedSeal.tsx'
import { DisplayNameWithMarks } from './DisplayNameWithMarks.tsx'

type AboutProfileSheetProps = {
  open: boolean
  onClose: () => void
  profile: PublicProfile
}

function formatMonthYear(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function AboutProfileSheet({ open, onClose, profile }: AboutProfileSheetProps) {
  const titleId = useId()
  const name = profile.displayName || profile.username
  const joined = formatMonthYear(profile.createdAt)
  const verifiedSince = profile.verifiedAt ? formatMonthYear(profile.verifiedAt) : null

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-full max-w-md">
      <div
        className="flex max-h-[min(90dvh,640px)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl md:rounded-3xl"
        data-testid="about-profile-sheet"
      >
        <h2 id={titleId} className="font-serif text-2xl text-ink">
          {aboutProfileCopy.sheetTitle}
        </h2>
        <div className="flex items-center gap-3">
          <ImageWithFallback
            src={profile.avatarUrl ?? undefined}
            alt=""
            label={name}
            className="!size-16 shrink-0"
          />
          <DisplayNameWithMarks
            name={name}
            verified={showsVerifiedSeal(profile.verified, profile.role)}
            sealSize="lg"
            nameClassName="text-lg font-semibold text-ink"
          />
        </div>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted">{aboutProfileCopy.dateJoinedLabel}</dt>
            <dd className="mt-1 text-ink">{joined || '—'}</dd>
          </div>
          {profile.country ? (
            <div>
              <dt className="text-muted">{aboutProfileCopy.accountBasedInLabel}</dt>
              <dd className="mt-1 text-ink">
                {countryFlag(profile.country)} {countryName(profile.country) ?? profile.country}
              </dd>
            </div>
          ) : null}
          {profile.verified && verifiedSince ? (
            <div>
              <dt className="text-muted">{aboutProfileCopy.verifiedLabel}</dt>
              <dd className="mt-1 flex items-center gap-2 text-ink">
                <VerifiedSeal size="md" />
                <span>{verifiedSince}</span>
              </dd>
            </div>
          ) : null}
        </dl>
        {profile.verified ? (
          <p className="text-sm text-muted">{aboutProfileCopy.verifiedExplanation}</p>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 self-end rounded-2xl border border-line px-4 text-sm font-semibold text-ink"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
