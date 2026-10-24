import { Link } from 'react-router-dom'
import { timeAwareGreeting } from '../../lib/home/greeting.ts'
import { countryFlag, countryName } from '../../lib/profiles/countries.ts'
import { focusRing } from '../shell/navItems.ts'

type HomeGreetingProps = {
  displayName: string
  timezone: string
  countryCode: string | null
  role: 'reader' | 'writer'
  writingStreak: number | null
  dailyPrompt: string | null
  dailyQuote: { text: string; author: string } | null
  continueReadingCount: number
}

export function HomeGreeting({
  displayName,
  timezone,
  countryCode,
  role,
  writingStreak,
  dailyPrompt,
  dailyQuote,
  continueReadingCount,
}: HomeGreetingProps) {
  const greeting = timeAwareGreeting(timezone, displayName)
  const cName = countryName(countryCode)

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5" data-testid="home-greeting">
      <h1 className="font-serif text-2xl text-ink">{greeting}</h1>
      {cName ? (
        <p className="text-sm text-muted" data-testid="home-greeting-country">
          {countryFlag(countryCode)} {cName}
        </p>
      ) : null}
      {dailyQuote ? (
        <figure className="border-l-2 border-coral pl-4 text-sm text-muted" data-testid="home-daily-quote">
          <blockquote>&ldquo;{dailyQuote.text}&rdquo;</blockquote>
          <figcaption className="mt-1 text-xs">&mdash; {dailyQuote.author}</figcaption>
        </figure>
      ) : null}
      {role === 'writer' ? (
        <div className="flex flex-col gap-1 text-sm text-muted">
          {writingStreak !== null && writingStreak > 0 ? (
            <p data-testid="home-writing-streak">
              Writing streak: <span className="font-medium text-ink">{writingStreak}</span> day{writingStreak === 1 ? '' : 's'}
            </p>
          ) : null}
          {dailyPrompt ? (
            <p data-testid="home-daily-prompt">
              Today&apos;s prompt: <span className="text-ink">{dailyPrompt}</span>
            </p>
          ) : null}
        </div>
      ) : continueReadingCount > 0 ? (
        <p className="text-sm text-muted">
          Pick up where you left off —{' '}
          <Link to="/library?tab=continue" className={`font-medium text-coral ${focusRing}`} data-testid="home-continue-reading">
            Continue reading
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted">Discover a poem or story to begin your reading journey.</p>
      )}
    </section>
  )
}
