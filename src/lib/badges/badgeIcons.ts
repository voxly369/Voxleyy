import type { BadgeKey } from './types.ts'
import { badgeMeta } from './badgeMeta.ts'

/** Maps icon_key values from the database to stable CSS modifier classes. */
export function badgeIconClass(iconKey: string, badgeKey?: BadgeKey): string {
  const key = iconKey || (badgeKey ? badgeMeta(badgeKey).iconKey : 'badge')
  if (key === 'founder') return 'bg-teal-700 text-white dark:bg-teal-500 dark:text-ink'
  if (key === 'verified') return 'bg-verified text-white'
  if (key === 'star' || key === 'featured') return 'bg-coral text-white'
  if (key === 'streak') return 'bg-amber-500 text-white'
  if (key === 'trophy') return 'bg-raised text-ink'
  return 'bg-raised text-coral'
}

export function badgeIconGlyph(iconKey: string, badgeKey?: BadgeKey): string {
  const key = iconKey || (badgeKey ? badgeMeta(badgeKey).iconKey : 'badge')
  switch (key) {
    case 'mic':
      return '🎤'
    case 'quill':
      return '✒️'
    case 'book-open':
      return '📖'
    case 'wave':
      return '🎙️'
    case 'books':
      return '📚'
    case 'flame':
      return '🔥'
    case 'seedling':
      return '🌱'
    case 'spark':
      return '✨'
    case 'star':
      return '⭐'
    case 'founder':
      return 'V'
    case 'verified':
      return '✓'
    case 'streak':
      return '🔥'
    case 'trophy':
      return '🏆'
    default:
      return '🏅'
  }
}
