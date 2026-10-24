import type { BadgeKey } from './types.ts'

const META: Record<string, { name: string; description: string; iconKey: string }> = {
  spoken_word: { name: 'Spoken Word', description: '5 published recitation videos', iconKey: 'mic' },
  poet: { name: 'Poet', description: '5 published poems', iconKey: 'quill' },
  storyteller: { name: 'Storyteller', description: '5 published written posts', iconKey: 'book-open' },
  voice: { name: 'Voice', description: '5 published voice clips', iconKey: 'wave' },
  author: { name: 'Author', description: 'Listed a book in the storefront', iconKey: 'books' },
  trending: { name: 'Trending', description: '1,000 likes on one post', iconKey: 'flame' },
  rising_creator: { name: 'Rising Creator', description: '100 followers', iconKey: 'seedling' },
  viral_creator: { name: 'Viral Creator', description: '10,000 total likes', iconKey: 'spark' },
  featured: { name: 'Featured', description: 'Awarded by the Voxly team', iconKey: 'star' },
  verified: { name: 'Verified', description: 'Verified supporter badge', iconKey: 'verified' },
  streak_7: { name: '7-day streak', description: '7 consecutive writing days', iconKey: 'streak' },
  streak_30: { name: '30-day streak', description: '30 consecutive writing days', iconKey: 'streak' },
  streak_100: { name: '100-day streak', description: '100 consecutive writing days', iconKey: 'streak' },
  streak_365: { name: '365-day streak', description: '365 consecutive writing days', iconKey: 'streak' },
  poem_of_month: { name: 'Poem of the Month', description: 'Most-liked poem in the calendar month', iconKey: 'trophy' },
  video_of_month: { name: 'Video of the Month', description: 'Top recitation video in the month', iconKey: 'trophy' },
  rising_star_month: { name: 'Rising Star of the Month', description: 'Fastest follower growth under 1,000 followers', iconKey: 'trophy' },
  most_read: { name: 'Most Read', description: 'Most-read book or chapter in the month', iconKey: 'trophy' },
  top_seller: { name: 'Top Seller', description: 'Highest sales in the month', iconKey: 'trophy' },
  monthly_top_10: { name: 'Monthly Top 10', description: 'Placed in the platform top ten writers', iconKey: 'trophy' },
  founder: { name: 'Founder', description: 'The person who built Voxly', iconKey: 'founder' },
}

export function badgeMeta(key: BadgeKey): { name: string; description: string; iconKey: string } {
  return (
    META[key] ?? {
      name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: 'Badge earned on Voxly',
      iconKey: 'badge',
    }
  )
}

export function badgeDisplayName(key: BadgeKey): string {
  return badgeMeta(key).name
}
