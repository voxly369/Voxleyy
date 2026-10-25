import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
import { EntranceAnimatedScene } from './EntranceAnimatedScene.tsx'
import { entrancePaletteForHour } from './entrancePalette.ts'
import { LocalTime } from '../time/LocalTime.tsx'
import {
  clampSwipeOffset,
  isHorizontalSwipeLocked,
  shouldCompleteSwipe,
  swipeProgressFromOffset,
} from '../../lib/entrance/swipeEnter.ts'
import { useEntranceMusic } from '../../lib/entrance/useEntranceMusic.ts'
import { EntranceMusicControls } from './EntranceMusicControls.tsx'

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
  const swipeHintId = useId()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { openCreateSheet } = useCreateSheet()
  const [open, setOpen] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [quote, setQuote] = useState<QuoteView | null>(null)
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null)
  const [continueReading, setContinueReading] = useState(false)
  const [writingStreak, setWritingStreak] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [sceneActive, setSceneActive] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(400)
  const [panelWidth, setPanelWidth] = useState(400)
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastMove = useRef<{ x: number; t: number } | null>(null)

  const timezone = profile?.timezone ?? 'UTC'
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const music = useEntranceMusic({
    entranceOpen: open,
    reducedMotion,
    entranceScreenEnabled: showEntranceScreen,
  })

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

  const finishEntrance = useCallback(async () => {
    setSceneActive(false)
    music.fadeOutAndStop()
    const today = localDateKey(timezone)
    writeDeviceLastVisitDay(today)
    setOpen(false)
    setExiting(false)
    setDragOffset(0)
    onFinished()
    await patchMyProfilePreferences({ last_entrance_local_date: today })
    requestAnimationFrame(() => {
      document.getElementById('main')?.focus({ preventScroll: true })
    })
  }, [music, onFinished, timezone])

  const startExitTransition = useCallback(() => {
    if (reducedMotion) {
      void finishEntrance()
      return
    }
    setExiting(true)
    setDragOffset(widthRef.current)
    window.setTimeout(() => {
      void finishEntrance()
    }, 320)
  }, [finishEntrance, reducedMotion])

  const dismiss = useCallback(() => {
    startExitTransition()
  }, [startExitTransition])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        void dismiss()
        return
      }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
        event.preventDefault()
        void music.onUserGesture()
        void dismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismiss, music])

  useEffect(() => {
    if (!open) return
    function onVisibility() {
      setSceneActive(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [open])

  useEffect(() => {
    if (!open) return
    function measure() {
      const w = panelRef.current?.offsetWidth || window.innerWidth
      widthRef.current = w
      setPanelWidth(w)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  const onPointerDown = (event: ReactPointerEvent) => {
    if (exiting) return
    pointerStart.current = { x: event.clientX, y: event.clientY, t: event.timeStamp }
    lastMove.current = { x: event.clientX, t: event.timeStamp }
    void music.onUserGesture()
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!pointerStart.current || exiting) return
    const dx = event.clientX - pointerStart.current.x
    const dy = event.clientY - pointerStart.current.y
    if (!isHorizontalSwipeLocked(Math.abs(dx), Math.abs(dy))) return
    lastMove.current = { x: event.clientX, t: event.timeStamp }
    const width = widthRef.current || window.innerWidth
    setDragOffset(clampSwipeOffset(dx, width))
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    if (!pointerStart.current || exiting) return
    const dx = event.clientX - pointerStart.current.x
    const width = widthRef.current || window.innerWidth
    const velocity =
      lastMove.current && event.timeStamp > lastMove.current.t
        ? (event.clientX - lastMove.current.x) / (event.timeStamp - lastMove.current.t)
        : 0
    pointerStart.current = null
    if (shouldCompleteSwipe(dx, width, velocity)) {
      startExitTransition()
      return
    }
    setDragOffset(0)
  }

  if (!open || !profile) return null

  const hour = hourInTimeZone(timezone)
  const greeting = entranceGreeting(timezone, profile.display_name, profile.username, {
    longAbsence: isLongAbsence(timezone, serverLastEntranceDate),
  })
  const fullName = profile.display_name.trim() || profile.username
  const cName = countryName(profile.country)
  const parallax = swipeProgressFromOffset(dragOffset, panelWidth || 1)
  const panelTransform = reducedMotion
    ? undefined
    : {
        transform: `translate3d(${exiting ? '100%' : `${dragOffset}px`}, 0, 0)`,
        transition: exiting || dragOffset === 0 ? 'transform 280ms ease-out' : 'none',
      }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-bg/95 backdrop-blur-sm motion-reduce:transition-none"
      data-testid="entrance-screen"
      role="presentation"
    >
      <div
        ref={panelRef}
        className="relative flex min-h-0 flex-1 flex-col touch-pan-y"
        style={panelTransform}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="absolute end-4 top-4 z-10 flex gap-2">
          <EntranceMusicControls
            visible={Boolean(music.track?.src)}
            musicState={music.musicState}
            muted={music.prefs.muted}
            onToggleMute={music.toggleMute}
            onStartFromBlocked={() => void music.onUserGesture()}
          />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-8">
          <EntranceAnimatedScene
            reducedMotion={reducedMotion}
            palette={entrancePaletteForHour(hour)}
            parallax={parallax}
            active={sceneActive && !exiting}
          />

          <div aria-live="polite" aria-atomic="true" className="w-full max-w-lg text-center">
            <h1 id={titleId} className="font-serif text-2xl text-ink">
              {greeting}
            </h1>
            <span className="sr-only">{fullName}</span>
          </div>

          <p
            id={swipeHintId}
            className="flex items-center justify-center gap-2 text-sm font-medium text-muted motion-reduce:opacity-100"
            data-testid="entrance-swipe-hint"
          >
            Swipe to step inside
            <span
              aria-hidden="true"
              className="inline-block motion-safe:animate-pulse motion-reduce:animate-none"
            >
              →
            </span>
          </p>

          {cName ? (
            <p className="text-sm text-muted" data-testid="entrance-country">
              {countryFlag(profile.country)} {cName} · <LocalTime timezone={timezone} />
            </p>
          ) : null}

          {quote ? (
            <figure className="max-w-lg border-l-2 border-coral ps-4 text-sm text-muted" data-testid="entrance-quote">
              <blockquote>&ldquo;{quote.text}&rdquo;</blockquote>
              <figcaption className="mt-1 text-xs">&mdash; {quote.author}</figcaption>
            </figure>
          ) : null}

          {dailyPrompt ? (
            <div className="flex max-w-lg flex-col gap-2" data-testid="entrance-daily-prompt">
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
            <p className="text-sm text-muted">
              Writing streak: {writingStreak} day{writingStreak === 1 ? '' : 's'}
            </p>
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
            onClick={() => {
              void music.onUserGesture()
              void dismiss()
            }}
            className={`inline-flex min-h-11 rounded-2xl px-6 text-base font-semibold text-white max-[767px]:hidden ${accessibleCoralFill} ${focusRing}`}
            data-testid="entrance-enter-button"
          >
            Enter
          </button>

          <button
            type="button"
            onClick={() => {
              void music.onUserGesture()
              void dismiss()
            }}
            className={`inline-flex min-h-11 rounded-2xl px-6 text-base font-semibold text-white min-[768px]:sr-only ${accessibleCoralFill} ${focusRing}`}
            data-testid="entrance-step-inside"
          >
            Step inside
          </button>
        </div>
      </div>
    </div>
  )
}
