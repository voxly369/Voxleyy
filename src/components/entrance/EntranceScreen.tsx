import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SIGNATURE_QUOTE } from '../../config/brand.ts'
import { fetchDailyQuoteForDay } from '../../lib/entrance/dailyQuoteView.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { countryFlag, countryName } from '../../lib/profiles/countries.ts'
import { hourInTimeZone, entranceGreeting, localDateKey } from '../../lib/home/greeting.ts'
import { isLongAbsence, shouldShowEntrance, writeDeviceLastVisitDay } from '../../lib/entrance/entranceSchedule.ts'
import { patchMyProfilePreferences } from '../../lib/onboarding/api.ts'
import { useCreateSheet } from '../../lib/shell/useCreateSheet.ts'
import { supabase } from '../../lib/supabaseClient.ts'
import { focusRing, accessibleCoralFill } from '../shell/navItems.ts'
import { EntranceIllustration, entrancePaletteForHour } from './EntranceIllustration.tsx'
import { LocalTime } from '../time/LocalTime.tsx'

const AUTO_CONTINUE_MS = 8000

type QuoteView = { text: string; author: string; source?: string | null }

type EntranceScreenProps = {
  serverLastEntranceDate: string | null
  showEntranceScreen: boolean
  firstEntranceEver: boolean
  onFinished: () => void
}

export function EntranceScreen({
  serverLastEntranceDate,
  showEntranceScreen,
  firstEntranceEver,
  onFinished,
}: EntranceScreenProps) {
  const titleId = useId()
  const liveId = useId()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { openCreateSheet } = useCreateSheet()
  const [open, setOpen] = useState(false)
  const [quote, setQuote] = useState<QuoteView | null>(null)
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null)
  const [continueReading, setContinueReading] = useState(false)
  const [writingStreak, setWritingStreak] = useState<number | null>(null)
  const paused = useRef(false)
  const timer = useRef<number | null>(null)

  const timezone = profile?.timezone ?? 'UTC'
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!profile) return
    const visible = shouldShowEntrance({
      timeZone: timezone,
      showEntranceScreen,
      serverLastEntranceDate,
    })
    setOpen(visible)
    if (!visible) return

    void (async () => {
      if (firstEntranceEver) {
        setQuote({ text: SIGNATURE_QUOTE.text, author: SIGNATURE_QUOTE.attribution })
      } else {
        const daily = await fetchDailyQuoteForDay(localDateKey(timezone), timezone)
        setQuote(daily)
      }
      const { data: prompt } = await supabase.rpc('writing_prompt_for_date')
      if (typeof prompt === 'string') setDailyPrompt(prompt)
      if (profile.role === 'writer') {
        const { getUserStreaks } = await import('../../lib/streaks/api.ts')
        const { liveCurrentStreak } = await import('../../lib/streaks/liveCurrentStreak.ts')
        const streaks = await getUserStreaks(profile.id)
        if (streaks.ok) setWritingStreak(liveCurrentStreak(streaks.data.writing, timezone))
      } else {
        const { listContinueReading } = await import('../../lib/library/listLibrary.ts')
        const cont = await listContinueReading()
        if (cont.ok) setContinueReading(cont.items.length > 0)
      }
    })()
  }, [profile, timezone, showEntranceScreen, serverLastEntranceDate, firstEntranceEver])

  const dismiss = useCallback(async () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    const today = localDateKey(timezone)
    writeDeviceLastVisitDay(today)
    setOpen(false)
    onFinished()
    await patchMyProfilePreferences({ last_entrance_local_date: today })
  }, [onFinished, timezone])

  useEffect(() => {
    if (!open || reducedMotion) return
    timer.current = window.setTimeout(() => {
      if (!paused.current) void dismiss()
    }, AUTO_CONTINUE_MS)
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [open, reducedMotion, dismiss])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') void dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  if (!open || !profile) return null

  const hour = hourInTimeZone(timezone)
  const greeting = entranceGreeting(timezone, profile.display_name, profile.username, {
    longAbsence: isLongAbsence(timezone, serverLastEntranceDate),
  })
  const fullName = profile.display_name.trim() || profile.username
  const cName = countryName(profile.country)

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg/95 px-4 py-8 backdrop-blur-sm"
      data-testid="entrance-screen"
      onMouseEnter={() => {
        paused.current = true
      }}
      onMouseLeave={() => {
        paused.current = false
      }}
      onFocusCapture={() => {
        paused.current = true
      }}
      onBlurCapture={() => {
        paused.current = false
      }}
    >
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-line bg-surface p-6 shadow-xl">
        <EntranceIllustration reducedMotion={reducedMotion} palette={entrancePaletteForHour(hour)} />
        <div aria-live="polite" aria-atomic="true">
          <h1 id={titleId} className="font-serif text-2xl text-ink">
            {greeting}
          </h1>
          <span className="sr-only">{fullName}</span>
        </div>
        {cName ? (
          <p className="text-sm text-muted" data-testid="entrance-country">
            {countryFlag(profile.country)} {cName}
            {' '}
            · <LocalTime timezone={timezone} />
          </p>
        ) : null}
        {quote ? (
          <figure className="border-l-2 border-coral pl-4 text-sm text-muted" data-testid="entrance-quote">
            <blockquote>&ldquo;{quote.text}&rdquo;</blockquote>
            <figcaption className="mt-1 text-xs">&mdash; {quote.author}</figcaption>
          </figure>
        ) : null}
        {dailyPrompt ? (
          <div className="flex flex-col gap-2" data-testid="entrance-daily-prompt">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Word of the day</p>
            <p className="font-serif text-lg text-ink">{dailyPrompt}</p>
            <button
              type="button"
              onClick={(event) => {
                void dismiss()
                openCreateSheet(event.currentTarget)
              }}
              className={`self-start text-sm font-semibold text-coral ${focusRing}`}
              data-testid="entrance-write-now"
            >
              Write now
            </button>
          </div>
        ) : null}
        {writingStreak !== null && writingStreak > 0 ? (
          <p className="text-sm text-muted">Writing streak: {writingStreak} day{writingStreak === 1 ? '' : 's'}</p>
        ) : null}
        {continueReading ? (
          <button
            type="button"
            onClick={() => {
              void dismiss()
              navigate('/library?tab=continue')
            }}
            className={`self-start text-sm font-medium text-coral ${focusRing}`}
          >
            Pick up where you left off
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void dismiss()}
          className={`min-h-11 rounded-2xl px-6 text-base font-semibold text-white ${accessibleCoralFill} ${focusRing}`}
          data-testid="entrance-step-inside"
        >
          Step inside
        </button>
      </div>
      <p id={liveId} className="sr-only">
        {greeting}
      </p>
    </div>
  )
}
