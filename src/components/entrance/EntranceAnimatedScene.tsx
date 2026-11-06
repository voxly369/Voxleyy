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

const STILL_PALETTE_COLORS = {
  dawn: { glow: '#f4c4a8', sky: '#e8d5c4', ink: '#5c4a42' },
  day: { glow: '#c9e4de', sky: '#f0f4f8', ink: '#3d4f5f' },
  dusk: { glow: '#d4a5a5', sky: '#c9b8a8', ink: '#4a3f55' },
  night: { glow: '#8b9dc3', sky: '#1a1f2e', ink: '#c8d0e0' },
} as const

function EntranceStillScene({ palette }: { palette: EntrancePalette }) {
  const colors = STILL_PALETTE_COLORS[palette]
  return (
    <div
      className="relative mx-auto aspect-[16/10] w-full max-w-xl overflow-hidden rounded-3xl"
      data-testid="entrance-scene-still"
    >
      <svg viewBox="0 0 400 250" role="img" aria-hidden="true" className="size-full" data-testid="entrance-illustration">
        <rect width="400" height="250" fill={colors.sky} />
        <circle cx="200" cy="125" r="70" fill={colors.glow} opacity="0.35" />
        <text
          x="200"
          y="230"
          textAnchor="middle"
          fill={colors.ink}
          fontFamily="Georgia, serif"
          fontSize="26"
          fontWeight="600"
        >
          Voxly
        </text>
      </svg>
    </div>
  )
}

export function EntranceAnimatedScene({
  reducedMotion,
  palette,
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
    return <EntranceStillScene palette={palette} />
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
