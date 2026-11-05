import { useCallback, useEffect, useRef, useState } from 'react'
import {
  WELCOME_SCENE_DURATION_MS,
  WELCOME_SCENE_MAX_MS,
  welcomeSceneProgress,
  welcomeSceneShouldHandOff,
} from '../../lib/entrance/welcomeSceneTiming.ts'
import { entrancePaletteForHour, type EntrancePalette } from './entrancePalette.ts'
import { WelcomeSceneSvg } from './WelcomeSceneSvg.tsx'

type EntranceAnimatedSceneProps = {
  reducedMotion: boolean
  palette: EntrancePalette
  /** 0–1 horizontal swipe parallax */
  parallax: number
  /** Pause motion when tab hidden or entrance closed */
  active: boolean
  fullScreen?: boolean
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
  fullScreen = false,
  quote = null,
  countryCodes = [],
  musicPulse = false,
  onSequenceHandoff,
}: EntranceAnimatedSceneProps) {
  const [progress, setProgress] = useState(0)
  const handoffRef = useRef(false)
  const startRef = useRef<number | null>(null)
  const [size, setSize] = useState({ w: 400, h: 400 })

  const handleHandoff = useCallback(() => {
    if (handoffRef.current) return
    handoffRef.current = true
    onSequenceHandoff?.()
  }, [onSequenceHandoff])

  useEffect(() => {
    if (reducedMotion || !active) return
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
  }, [active, handleHandoff, reducedMotion])

  useEffect(() => {
    function measure() {
      const w = window.innerWidth
      const h = fullScreen ? window.innerHeight : Math.min(window.innerHeight * 0.45, 420)
      setSize({ w: Math.max(320, w), h: Math.max(280, h) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [fullScreen])

  if (reducedMotion) {
    return <EntranceStillScene palette={palette} />
  }

  const shellClass = fullScreen
    ? 'fixed inset-0 z-[5] overflow-hidden bg-[#0f1218]'
    : 'relative mx-auto aspect-[16/10] w-full max-w-xl overflow-hidden rounded-3xl bg-[#0f1218]'

  return (
    <div className={shellClass} data-testid="entrance-scene">
      <WelcomeSceneSvg
        progress={progress}
        parallax={parallax}
        quote={quote}
        countryCodes={countryCodes}
        musicPulse={musicPulse}
        width={size.w}
        height={size.h}
      />
      <span className="sr-only" data-testid="entrance-scene-elapsed-ms">
        {Math.round(progress * WELCOME_SCENE_DURATION_MS)}
      </span>
    </div>
  )
}

export { entrancePaletteForHour }
