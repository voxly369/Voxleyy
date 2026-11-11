import '@fontsource/dancing-script/400.css'

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  WELCOME_SCENE_DURATION_MS,
  WELCOME_SCENE_MAX_MS,
  welcomeSceneProgress,
  welcomeSceneShouldHandOff,
} from '../../lib/entrance/welcomeSceneTiming.ts'
import { entrancePaletteForHour, type EntrancePalette } from './entrancePalette.ts'

const WelcomeSceneSvg = lazy(() =>
  import('./WelcomeSceneSvg.tsx').then((mod) => ({ default: mod.WelcomeSceneSvg })),
)

type EntranceAnimatedSceneProps = {
  reducedMotion: boolean
  palette: EntrancePalette
  /** 0–1 horizontal swipe parallax */
  parallax: number
  /** Pause motion when tab hidden or entrance closed */
  active: boolean
  cinematic?: boolean
  quote?: { text: string; author: string } | null
  countryCodes?: string[]
  musicPulse?: boolean
  onSequenceHandoff?: () => void
}

function EntranceStillScene() {
  return (
    <div
      className="relative mx-auto aspect-[9/16] w-full max-w-md overflow-hidden rounded-3xl bg-[#0a0c10]"
      data-testid="entrance-scene-still"
    >
      <svg viewBox="0 0 390 700" role="img" aria-hidden="true" className="size-full" data-testid="entrance-illustration">
        <rect width="390" height="700" fill="#0a0c10" />
        <circle cx="88" cy="58" r="42" fill="#f4c89a" opacity="0.12" />
        <ellipse cx="88" cy="52" rx="10" ry="12" fill="#f4c89a" opacity="0.65" />
        <circle cx="195" cy="310" r="52" fill="#141c28" stroke="#f4c89a" strokeWidth="0.5" strokeOpacity="0.25" />
        <ellipse cx="195" cy="310" rx="62" ry="18" fill="none" stroke="#FF5A3C" strokeWidth="0.8" opacity="0.25" />
        <text
          x="195"
          y="248"
          textAnchor="middle"
          fill="#FF5A3C"
          fontFamily="'Dancing Script', cursive"
          fontSize="56"
        >
          Voxly
        </text>
      </svg>
    </div>
  )
}

export function EntranceAnimatedScene({
  reducedMotion,
  palette: _palette,
  parallax,
  active,
  cinematic = false,
  quote = null,
  countryCodes = [],
  musicPulse = false,
  onSequenceHandoff,
}: EntranceAnimatedSceneProps) {
  const [progress, setProgress] = useState(0)
  const handoffRef = useRef(false)
  const startRef = useRef<number | null>(null)
  const [size, setSize] = useState({ w: 390, h: 844 })

  const handleHandoff = useCallback(() => {
    if (handoffRef.current) return
    handoffRef.current = true
    onSequenceHandoff?.()
  }, [onSequenceHandoff])

  useEffect(() => {
    if (reducedMotion || !active || !cinematic) return
    handoffRef.current = false
    startRef.current = performance.now()
    setProgress(0)
    let raf = 0
    const tick = (now: number) => {
      const start = startRef.current ?? now
      const elapsed = now - start
      setProgress(welcomeSceneProgress(elapsed))
      if (welcomeSceneShouldHandOff(elapsed)) handleHandoff()
      if (elapsed <= WELCOME_SCENE_MAX_MS + 200) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, cinematic, handleHandoff, reducedMotion])

  useEffect(() => {
    if (!cinematic) return
    function measure() {
      setSize({ w: Math.max(320, window.innerWidth), h: Math.max(280, window.innerHeight) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [cinematic])

  if (reducedMotion) {
    return <EntranceStillScene />
  }

  if (!cinematic) return null

  const dissolve = Math.max(0, (progress - 5 / 7) / (2 / 7))
  const dissolveEase = 1 - (1 - Math.min(1, dissolve)) ** 2
  const pushScale = 1 + dissolveEase * 0.12

  return (
    <div
      className="welcome-cinematic fixed inset-0 z-[5] overflow-hidden bg-[#0a0c10] motion-reduce:hidden"
      data-testid="entrance-scene"
      style={{
        opacity: 1 - dissolveEase * 0.98,
        transform: `scale(${pushScale})`,
        transition: 'none',
        willChange: 'opacity, transform',
      }}
    >
      <Suspense fallback={null}>
        <WelcomeSceneSvg
          progress={progress}
          parallax={parallax}
          quote={quote}
          countryCodes={countryCodes}
          musicPulse={musicPulse}
          width={size.w}
          height={size.h}
        />
      </Suspense>
      <span className="sr-only" data-testid="entrance-scene-elapsed-ms">
        {Math.round(progress * WELCOME_SCENE_DURATION_MS)}
      </span>
    </div>
  )
}

export { entrancePaletteForHour }
