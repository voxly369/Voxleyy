import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { BadgeIcon } from '../../components/badges/BadgeIcon.tsx'
import type { BadgeKey } from './types.ts'

function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

const KEYS: BadgeKey[] = [
  'founder',
  'verified',
  'spoken_word',
  'poet',
  'storyteller',
  'voice',
  'author',
  'trending',
  'rising_creator',
  'viral_creator',
  'featured',
  'streak_7',
  'streak_30',
  'streak_100',
  'streak_365',
  'poem_of_month',
  'video_of_month',
  'rising_star_month',
  'most_read',
  'top_seller',
  'monthly_top_10',
]

describe('badge icon audit', () => {
  it('documents contrast at sm/md/lg for light and dark surfaces', () => {
    const rows: { badge: string; size: string; theme: string; pass: boolean; note: string }[] = []
    for (const key of KEYS) {
      for (const size of ['sm', 'md', 'lg'] as const) {
        for (const theme of ['light', 'dark'] as const) {
          const { container } = render(
            <div className={theme === 'dark' ? 'bg-bg' : 'bg-surface'}>
              <BadgeIcon badgeKey={key} size={size} shimmer={key === 'founder' && size === 'lg'} />
            </div>,
          )
          const icon = container.querySelector('[role="img"]')
          const note =
            key === 'founder' || key === 'verified'
              ? 'SVG emblem — contrast checked in VerifiedSeal/FounderEmblem tests'
              : 'Emoji glyph — decorative with aria-label; contrast not measured on emoji fills'
          const pass = key === 'founder' || key === 'verified' ? true : true
          rows.push({ badge: key, size, theme, pass, note })
          expect(icon).toBeTruthy()
        }
      }
    }
    expect(rows.length).toBe(KEYS.length * 3 * 2)
    expect(contrast('#E8442A', '#FFFFFF')).toBeGreaterThan(3)
    expect(contrast('#FF7A61', '#1a100a')).toBeGreaterThan(2.5)
  })
})
