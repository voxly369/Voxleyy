import { liveCurrentStreak } from '../../lib/streaks/liveCurrentStreak.ts'
import type { UserStreaks } from '../../lib/streaks/api.ts'

type ProfileStreakChipsProps = {
  streaks: UserStreaks
  timeZone: string
}

export function ProfileStreakChips({ streaks, timeZone }: ProfileStreakChipsProps) {
  const writingLive = liveCurrentStreak(streaks.writing, timeZone)
  const readingLive = liveCurrentStreak(streaks.reading, timeZone)
  if (writingLive === 0 && readingLive === 0 && streaks.writing.longest === 0 && streaks.reading.longest === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-2 px-5" data-testid="profile-streak-chips">
      {writingLive > 0 || streaks.writing.longest > 0 ? (
        <span className="rounded-full bg-raised px-3 py-1 text-sm font-medium text-ink">
          Writing streak {writingLive}
          {streaks.writing.longest > writingLive ? (
            <span className="text-muted"> · best {streaks.writing.longest}</span>
          ) : null}
        </span>
      ) : null}
      {readingLive > 0 || streaks.reading.longest > 0 ? (
        <span className="rounded-full bg-raised px-3 py-1 text-sm font-medium text-ink">
          Reading streak {readingLive}
          {streaks.reading.longest > readingLive ? (
            <span className="text-muted"> · best {streaks.reading.longest}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
