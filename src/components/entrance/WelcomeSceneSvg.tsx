import { globeLightsForCountryCodes, projectGlobePoint } from '../../lib/entrance/countryGlobeLights.ts'
import {
  welcomeSceneEase,
  welcomeSceneElapsedMs,
  welcomeScenePhaseT,
  welcomeSceneStagger,
  WELCOME_PHASE1_END_MS,
  WELCOME_PHASE2_END_MS,
  WELCOME_SCENE_DURATION_MS,
} from '../../lib/entrance/welcomeSceneTiming.ts'

const CORAL = '#FF5A3C'
const ROOM = '#0a0c10'
const INK = '#1e2430'
const WARM = '#f4c89a'

export type WelcomeSceneSvgProps = {
  progress: number
  parallax: number
  quote: { text: string; author: string } | null
  countryCodes: string[]
  musicPulse: boolean
  width: number
  height: number
}

/** Stroke paths for “Voxly” left to right (40×40 box per letter). */
const VOXY_LETTERS = [
  { d: 'M 6 38 L 20 6 L 34 38', len: 78 },
  { d: 'M 20 12 a 9 9 0 1 0 0.01 0', len: 58 },
  { d: 'M 8 10 L 32 34 M 32 10 L 8 34', len: 96 },
  { d: 'M 22 8 L 22 38', len: 30 },
  { d: 'M 8 12 L 20 38 L 32 12 M 20 38 L 20 28', len: 88 },
] as const

const LETTER_SPACING = 44
const LETTER_BOX = 40

function depthShift(layer: number, parallax: number): number {
  const weights = [0.25, 0.55, 0.9]
  return parallax * (weights[layer] ?? 0.5) * 28
}

export function WelcomeSceneSvg({
  progress,
  parallax,
  quote,
  countryCodes,
  musicPulse,
  width,
  height,
}: WelcomeSceneSvgProps) {
  const elapsed = welcomeSceneElapsedMs(progress)
  const phase1 = welcomeScenePhaseT(elapsed, 0, WELCOME_PHASE1_END_MS)
  const phase2 = welcomeScenePhaseT(elapsed, WELCOME_PHASE1_END_MS, WELCOME_PHASE2_END_MS)
  const phase3 = welcomeScenePhaseT(elapsed, WELCOME_PHASE2_END_MS, WELCOME_SCENE_DURATION_MS)

  const cx = width / 2
  const cy = height * 0.46
  const globeR = Math.min(width, height) * 0.13
  const lights = globeLightsForCountryCodes(countryCodes)
  const globeSpin = welcomeSceneEase(phase2) * Math.PI * 0.75 + progress * 0.2
  const bulbX = width * 0.22
  const bulbY = height * 0.28
  const bulbOn = welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 2)

  const waveAmp = musicPulse
    ? 0.5 + 0.5 * Math.sin(progress * Math.PI * 8)
    : 0.25 + welcomeSceneEase(phase2) * 0.35

  const quoteFade =
    quote && phase3 > 0
      ? welcomeSceneEase(Math.min(1, phase3 / 0.55)) * (1 - welcomeSceneEase(Math.max(0, (phase3 - 0.55) / 0.45)))
      : 0

  const titleScale = Math.min(1.15, Math.max(0.82, width / 390))
  const titleSpan = (VOXY_LETTERS.length - 1) * LETTER_SPACING + LETTER_BOX
  const titleX = cx - (titleSpan * titleScale) / 2 + depthShift(2, parallax)
  const titleY = height * 0.4
  const penLetterIndex = Math.min(
    VOXY_LETTERS.length - 1,
    Math.max(0, Math.floor(phase1 * VOXY_LETTERS.length)),
  )
  const penLetterT = welcomeSceneEase(
    Math.max(
      0,
      Math.min(1, phase1 * VOXY_LETTERS.length - penLetterIndex),
    ),
  )
  const penX = penLetterIndex * LETTER_SPACING + penLetterT * LETTER_SPACING

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-hidden="true"
      data-testid="entrance-illustration"
      className="welcome-scene-svg block size-full"
    >
      <defs>
        <radialGradient id="ws-bulb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={WARM} stopOpacity="0.55" />
          <stop offset="45%" stopColor={CORAL} stopOpacity="0.12" />
          <stop offset="100%" stopColor={ROOM} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ws-leather" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d2a22" />
          <stop offset="50%" stopColor="#5c4034" />
          <stop offset="100%" stopColor="#2a1c16" />
        </linearGradient>
        <linearGradient id="ws-page-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e6" />
          <stop offset="100%" stopColor="#ddd4c4" />
        </linearGradient>
        <linearGradient id="ws-nib" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8ecf0" />
          <stop offset="100%" stopColor="#8a939e" />
        </linearGradient>
        <filter id="ws-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="ws-ink-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ws-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.035" />
          </feComponentTransfer>
        </filter>
        <radialGradient id="ws-vignette" cx="50%" cy="45%" r="70%">
          <stop offset="55%" stopColor={ROOM} stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
        <clipPath id="ws-globe-clip">
          <circle cx={cx} cy={cy} r={globeR} />
        </clipPath>
      </defs>

      <rect width={width} height={height} fill={ROOM} />

      {/* Back layer — slowest (full bleed, no frame) */}
      <g transform={`translate(${depthShift(0, parallax)} 0)`} opacity={0.35 + phase2 * 0.4}>
        <rect width={width} height={height} fill={INK} opacity={0.12} />
        <ellipse cx={cx} cy={height * 0.92} rx={width * 0.48} ry={height * 0.05} fill="#000" opacity={0.35} />
      </g>

      {/* Warm glow follows bulb */}
      <circle cx={bulbX} cy={bulbY} r={width * 0.55 * bulbOn} fill="url(#ws-bulb-glow)" opacity={bulbOn * 0.85} />

      {/* Mid layer */}
      <g transform={`translate(${depthShift(1, parallax)} 0)`} filter="url(#ws-soft-shadow)">
        {phase2 > 0 ? (
          <g
            transform={`translate(${cx} ${height * 0.58 - welcomeSceneEase(phase2) * 36})`}
            opacity={welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 1)}
          >
            <rect x={-42} y={8} width={38} height={10} rx={1} fill="url(#ws-leather)" />
            <rect x={-38} y={-2} width={38} height={10} rx={1} fill="url(#ws-leather)" />
            <g transform={`rotate(${-6 + welcomeSceneEase(phase2) * 18} 0 0)`}>
              <rect x={-34} y={-14} width={40} height={12} rx={1} fill="url(#ws-leather)" />
              {[0, 1, 2].map((pg) => (
                <path
                  key={pg}
                  d={`M 6 ${pg * 2 - 4} Q 22 ${-10 + pg * 4 + phase2 * 8} 16 ${6 + pg * 2}`}
                  fill="none"
                  stroke="url(#ws-page-edge)"
                  strokeWidth={1.4}
                  opacity={0.55 + phase2 * 0.35}
                />
              ))}
            </g>
          </g>
        ) : null}

        {phase2 > 0 ? (
          <g transform={`translate(${cx} ${cy})`} opacity={welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 3)}>
            <circle r={globeR + 3} fill={INK} opacity={0.5} />
            <circle r={globeR} fill="#141c28" stroke={WARM} strokeWidth={0.6} strokeOpacity={0.25} />
            <g clipPath="url(#ws-globe-clip)">
              <path
                d={`M ${cx - globeR} ${cy} Q ${cx} ${cy - globeR * 0.35} ${cx + globeR} ${cy}`}
                fill="#1a2838"
                opacity={0.7}
              />
              <path
                d={`M ${cx - globeR * 0.7} ${cy + globeR * 0.2} Q ${cx} ${cy + globeR * 0.5} ${cx + globeR * 0.6} ${cy + globeR * 0.15}`}
                fill="#1a2838"
                opacity={0.65}
              />
              {lights.map((light, i) => {
                const pt = projectGlobePoint(light.lat, light.lng, cx, cy, globeR * 0.9, globeSpin)
                if (!pt.visible) return null
                const lit = welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 4 + i)
                return (
                  <circle key={`${light.code}-${i}`} cx={pt.x} cy={pt.y} r={light.decorative ? 2 : 2.8} fill={CORAL} opacity={0.3 + lit * 0.7} />
                )
              })}
            </g>
          </g>
        ) : null}
      </g>

      {/* Front layer — fastest */}
      <g transform={`translate(${depthShift(2, parallax)} 0)`}>
        {/* Pen writes “Voxly” left to right (phase 1) */}
        <g
          transform={`translate(${titleX} ${titleY}) scale(${titleScale})`}
          filter="url(#ws-ink-glow)"
          opacity={0.35 + phase1 * 0.65}
        >
          {VOXY_LETTERS.map((letter, i) => {
            const letterStart = i / VOXY_LETTERS.length
            const letterEnd = (i + 1) / VOXY_LETTERS.length
            const localT = welcomeSceneEase(
              Math.max(0, Math.min(1, (phase1 - letterStart * 0.85) / (letterEnd - letterStart + 0.15))),
            )
            return (
              <path
                key={i}
                d={letter.d}
                transform={`translate(${i * LETTER_SPACING} 0)`}
                fill="none"
                stroke={CORAL}
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={letter.len}
                strokeDashoffset={letter.len * (1 - localT)}
                opacity={0.6 + localT * 0.4}
              />
            )
          })}
          <g transform={`translate(${penX + 18} 22)`} filter="url(#ws-soft-shadow)" opacity={phase1 > 0.02 ? 1 : 0}>
            <rect x={-3} y={-26} width={6} height={22} rx={2} fill="url(#ws-nib)" />
            <path d="M -2 4 L 0 14 L 2 4" fill={INK} opacity={0.7} />
            <circle cx={0} cy={16} r={2.5} fill={CORAL} opacity={0.85} />
          </g>
        </g>

        {/* Quills (phase 2) */}
        {[
          { sx: -50, sy: height * 0.38, ex: width * 0.32, ey: height * 0.4, rot: -22 },
          { sx: width + 40, sy: height * 0.44, ex: width * 0.68, ey: height * 0.36, rot: 18 },
          { sx: -40, sy: height * 0.58, ex: width * 0.4, ey: height * 0.52, rot: -8 },
        ].map((q, i) => {
          const t = welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, i)
          const x = q.sx + (q.ex - q.sx) * t
          const y = q.sy + (q.ey - q.sy) * t
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${q.rot})`} opacity={t}>
              <path d="M 0 0 Q 36 18 72 0" fill="none" stroke={CORAL} strokeWidth={2} opacity={0.25 + t * 0.45} strokeLinecap="round" />
              <path d="M -2 14 L 0 -16 L 2 14 Z" fill={INK} opacity={0.55 + t * 0.4} filter="url(#ws-soft-shadow)" />
            </g>
          )
        })}

        {/* Bulb */}
        <g transform={`translate(${bulbX} ${bulbY})`} filter="url(#ws-soft-shadow)">
          <circle r={22 + bulbOn * 14} fill={CORAL} opacity={0.04 + bulbOn * 0.14} />
          <ellipse rx={10} ry={12} fill={WARM} opacity={0.25 + bulbOn * 0.65} />
          <path d="M -6 10 Q 0 18 6 10" stroke={INK} strokeWidth={1.4} fill="none" opacity={0.65} />
        </g>

        {/* Mic + wave */}
        <g
          transform={`translate(${width * 0.72 + depthShift(2, parallax)} ${height * 0.62})`}
          opacity={welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 5)}
        >
          {Array.from({ length: 7 }).map((_, i) => {
            const mid = 3
            const h = 6 + Math.abs(i - mid) * 2 + waveAmp * (14 - Math.abs(i - mid) * 2.5)
            return (
              <rect
                key={i}
                x={i * 6 - 18}
                y={-h / 2}
                width={3.5}
                height={h}
                rx={1.5}
                fill={CORAL}
                opacity={0.22 + waveAmp * 0.5}
              />
            )
          })}
          <rect x={-4} y={-9} width={8} height={12} rx={3.5} fill={INK} opacity={0.7} />
          <path d="M -7 5 Q 0 12 7 5" stroke={INK} strokeWidth={1.1} fill="none" opacity={0.55} />
        </g>

        {/* Ink blooms + paper unroll */}
        {[0, 1].map((i) => {
          const t = welcomeSceneStagger(elapsed, 400, i + 6)
          return (
            <circle
              key={`drop-${i}`}
              cx={width * (0.62 + i * 0.08)}
              cy={height * (0.72 + i * 0.03)}
              r={3 + t * 16}
              fill={CORAL}
              opacity={0.06 + t * 0.18}
            />
          )
        })}
        <g
          transform={`translate(${width * 0.08}, ${height * 0.7}) scale(${0.12 + welcomeSceneEase(phase1) * 0.88}, 1)`}
          opacity={0.3 + phase1 * 0.45}
        >
          <rect width={width * 0.45} height={32} rx={3} fill="#ebe3d6" filter="url(#ws-soft-shadow)" />
        </g>
      </g>

      {quote && quoteFade > 0.02 ? (
        <text
          x={cx}
          y={height * 0.82}
          textAnchor="middle"
          fill="#d0d8e4"
          fontFamily="Georgia, serif"
          fontSize={15}
          fontStyle="italic"
          opacity={quoteFade}
        >
          {quote.text.length > 64 ? `${quote.text.slice(0, 61)}…` : quote.text}
        </text>
      ) : null}

      <rect width={width} height={height} fill="url(#ws-vignette)" pointerEvents="none" />
      <rect width={width} height={height} filter="url(#ws-grain)" opacity={0.85} pointerEvents="none" />
    </svg>
  )
}
