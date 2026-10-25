import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { buildSceneItems, sceneElementCap } from '../../lib/entrance/sceneElements.ts'
import { entrancePaletteForHour, type EntrancePalette } from './entrancePalette.ts'

type EntranceAnimatedSceneProps = {
  reducedMotion: boolean
  palette: EntrancePalette
  /** 0–1 horizontal swipe parallax */
  parallax: number
  /** Pause CSS motion when tab hidden or entrance closed */
  active: boolean
}

const PALETTE_COLORS = {
  dawn: { glow: '#f4c4a8', sky: '#e8d5c4', ink: '#5c4a42', accent: '#FF5A3C' },
  day: { glow: '#c9e4de', sky: '#f0f4f8', ink: '#3d4f5f', accent: '#FF5A3C' },
  dusk: { glow: '#d4a5a5', sky: '#c9b8a8', ink: '#4a3f55', accent: '#FF5A3C' },
  night: { glow: '#8b9dc3', sky: '#1a1f2e', ink: '#c8d0e0', accent: '#FF5A3C' },
} as const

function itemGlyph(kind: string, colors: (typeof PALETTE_COLORS)[EntrancePalette]) {
  switch (kind) {
    case 'page':
      return (
        <rect x="-8" y="-10" width="16" height="20" rx="2" fill={colors.ink} opacity="0.35" />
      )
    case 'quill':
      return <path d="M-2 10 L0 -10 L2 10 Z" fill={colors.ink} opacity="0.5" />
    case 'book':
      return (
        <>
          <rect x="-9" y="-6" width="18" height="12" rx="1" fill={colors.ink} opacity="0.4" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke={colors.sky} strokeWidth="1" />
        </>
      )
    case 'mic':
      return (
        <>
          <rect x="-3" y="-8" width="6" height="10" rx="3" fill={colors.ink} opacity="0.45" />
          <path d="M-6 4 Q0 10 6 4" stroke={colors.ink} strokeWidth="1.2" fill="none" opacity="0.45" />
        </>
      )
    case 'notebook':
      return <rect x="-7" y="-9" width="14" height="18" rx="2" fill={colors.ink} opacity="0.3" />
    case 'sticker':
      return <circle r="5" fill={colors.accent} opacity="0.55" />
    default:
      return <circle r="2" fill={colors.glow} opacity="0.7" />
  }
}

export function EntranceAnimatedScene({ reducedMotion, palette, parallax, active }: EntranceAnimatedSceneProps) {
  const colors = PALETTE_COLORS[palette]
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 375)
  const cap = sceneElementCap(width)
  const items = useMemo(() => buildSceneItems(cap), [cap])

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const motionClass = reducedMotion || !active ? '' : 'entrance-scene-motion'

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-xl overflow-hidden rounded-3xl" data-testid="entrance-scene">
      <style>{`
        @keyframes entrance-drift {
          0% { transform: translate3d(var(--ex), var(--ey), 0) scale(var(--es)); opacity: 0.85; }
          50% { transform: translate3d(calc(var(--ex) + 6px), calc(var(--ey) - 8px), 0) scale(var(--es)); opacity: 1; }
          100% { transform: translate3d(var(--ex), var(--ey), 0) scale(var(--es)); opacity: 0.85; }
        }
        .entrance-scene-motion .entrance-float {
          animation: entrance-drift var(--edur, 12s) ease-in-out infinite;
          animation-delay: var(--edelay, 0s);
        }
      `}</style>
      <svg
        viewBox="0 0 400 250"
        role="img"
        aria-hidden="true"
        className="size-full"
        data-testid="entrance-illustration"
      >
        <rect width="400" height="250" fill={colors.sky} />
        {!reducedMotion ? (
          <circle cx="200" cy="125" r="70" fill={colors.glow} opacity="0.35" />
        ) : (
          <circle cx="200" cy="125" r="70" fill={colors.glow} opacity="0.35" />
        )}
        {items.map((item) => {
          const px = (item.x / 100) * 400 + parallax * item.depth * 40
          const py = (item.y / 100) * 250
          return (
            <g
              key={item.id}
              className={motionClass ? 'entrance-float' : undefined}
              style={
                {
                  ['--ex' as string]: `${px - 200}px`,
                  ['--ey' as string]: `${py - 125}px`,
                  ['--es' as string]: String(item.scale),
                  ['--edur' as string]: `${10 + item.delay}s`,
                  ['--edelay' as string]: `${item.delay}s`,
                  transform: `translate(${px}px, ${py}px)`,
                  opacity: 0.55 + item.depth * 0.35,
                } as CSSProperties
              }
            >
              {itemGlyph(item.kind, colors)}
            </g>
          )
        })}
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

export { entrancePaletteForHour }
