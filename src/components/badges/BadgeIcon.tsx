import { badgeDisplayName } from '../../lib/badges/badgeMeta.ts'
import { badgeIconClass, badgeIconGlyph } from '../../lib/badges/badgeIcons.ts'
import type { BadgeKey } from '../../lib/badges/types.ts'
import { FounderEmblem } from './FounderEmblem.tsx'
import { VerifiedSeal } from '../profile/VerifiedSeal.tsx'

type BadgeIconProps = {
  badgeKey: BadgeKey
  iconKey?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  shimmer?: boolean
}

const SIZE = {
  sm: 'size-5 text-[10px]',
  md: 'size-6 text-xs',
  lg: 'size-12 text-lg',
} as const

export function BadgeIcon({ badgeKey, iconKey, size = 'sm', className = '', shimmer = false }: BadgeIconProps) {
  const label = badgeDisplayName(badgeKey)
  const key = iconKey ?? badgeKey

  if (key === 'founder' || badgeKey === 'founder') {
    const emblemSize = size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'
    return <FounderEmblem size={emblemSize} shimmer={shimmer && emblemSize !== 'sm'} className={className} />
  }

  if (key === 'verified' || badgeKey === 'verified') {
    const sealSize = size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'
    return <VerifiedSeal size={sealSize} className={className} />
  }

  const glyph = badgeIconGlyph(key, badgeKey)
  const tone = badgeIconClass(key, badgeKey)
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none ${SIZE[size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm']} ${tone} ${className}`}
    >
      <span aria-hidden="true">{glyph}</span>
    </span>
  )
}
