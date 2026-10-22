import { badgeDisplayName } from '../../lib/badges/badgeMeta.ts'
import { badgeIconClass, badgeIconGlyph } from '../../lib/badges/badgeIcons.ts'
import type { BadgeKey } from '../../lib/badges/types.ts'

type BadgeIconProps = {
  badgeKey: BadgeKey
  iconKey?: string
  size?: 'sm' | 'md'
  className?: string
}

const SIZE = {
  sm: 'size-5 text-[10px]',
  md: 'size-6 text-xs',
} as const

export function BadgeIcon({ badgeKey, iconKey, size = 'sm', className = '' }: BadgeIconProps) {
  const label = badgeDisplayName(badgeKey)
  const glyph = badgeIconGlyph(iconKey ?? '', badgeKey)
  const tone = badgeIconClass(iconKey ?? '', badgeKey)
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none ${SIZE[size]} ${tone} ${className}`}
    >
      <span aria-hidden="true">{glyph}</span>
    </span>
  )
}
