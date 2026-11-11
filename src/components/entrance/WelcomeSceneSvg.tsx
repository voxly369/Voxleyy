import '@fontsource/dancing-script/400.css'

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
const QUOTE_INK = '#d0d8e4'
const TITLE = 'Voxly'

export type WelcomeSceneSvgProps = {
  progress: number
  parallax: number
  quote: { text: string; author: string } | null
  countryCodes: string[]
  musicPulse: boolean
  width: number
  height: number
}

const DUST_SPECS = [
  { x: 0.12, y: 0.18, r: 0.55 },
  { x: 0.28, y: 0.32, r: 1.1 },
  { x: 0.45, y: 0.12, r: 0.7 },
  { x: 0.62, y: 0.26, r: 0.9 },
  { x: 0.78, y: 0.14, r: 0.6 },
  { x: 0.88, y: 0.38, r: 1.0 },
  { x: 0.16, y: 0.52, r: 0.75 },
  { x: 0.34, y: 0.68, r: 0.85 },
  { x: 0.52, y: 0.58, r: 0.65 },
  { x: 0.71, y: 0.72, r: 1.05 },
  { x: 0.84, y: 0.56, r: 0.8 },
  { x: 0.4, y: 0.84, r: 0.7 },
] as const

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
  const bulbX = width * 0.22
  const bulbY = height * 0.1
  const bulbOn = welcomeSceneStagger(elapsed, 0, 0)

  const titleFontSize = Math.min(78, Math.max(52, width * 0.19))
  const titleY = height * 0.36
  const titleW = titleFontSize * 3.35
  const titleX = cx - titleW / 2
  const titleWrite = welcomeScenePhaseT(elapsed, 450, WELCOME_PHASE1_END_MS - 100)
  const titleClipW = titleW * titleWrite
  const penX = titleX + titleClipW
  const penY = titleY - titleFontSize * 0.15

  const globeY = height * 0.5
  const globeR = Math.min(width, height) * 0.11
  const lights = globeLightsForCountryCodes(countryCodes)
  const globeSpin = welcomeSceneEase(phase2) * Math.PI * 0.85 + progress * 0.25
  const globeIn = welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 2)

  const waveAmp = musicPulse
    ? 0.5 + 0.5 * Math.sin(progress * Math.PI * 8)
    : 0.25 + welcomeSceneEase(phase2) * 0.35

  const quoteFade =
    quote && phase3 > 0
      ? welcomeSceneEase(Math.min(1, phase3 / 0.55)) *
        (1 - welcomeSceneEase(Math.max(0, (phase3 - 0.55) / 0.45)))
      : 0

  const driftQuillT = welcomeSceneEase(Math.min(1, phase2 * 1.05))
  const driftX = width * (0.04 + driftQuillT * 0.32)
  const driftY = height * (0.64 - driftQuillT * 0.06)
  const trailLit = welcomeScenePhaseT(elapsed, WELCOME_PHASE1_END_MS + 200, WELCOME_PHASE2_END_MS)

  const pageTurn = welcomeSceneEase(phase2) * 22

  const floatBook = welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 0)
  const topBookY = height * 0.14 + Math.sin(progress * Math.PI * 2) * 4 * floatBook

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
        <linearGradient id="ws-parchment" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ebe3d6" />
          <stop offset="100%" stopColor="#d8cdbf" />
        </linearGradient>
        <linearGradient id="ws-nib" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8ecf0" />
          <stop offset="100%" stopColor="#8a939e" />
        </linearGradient>
        <filter id="ws-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="ws-title-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
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
          <circle cx={cx} cy={globeY} r={globeR} />
        </clipPath>
        <clipPath id="ws-title-clip">
          <rect
            x={titleX}
            y={titleY - titleFontSize}
            width={Math.max(0, titleClipW)}
            height={titleFontSize * 1.35}
          />
        </clipPath>
      </defs>

      <rect width={width} height={height} fill={ROOM} />

      <g opacity={0.25 + bulbOn * 0.35}>
        {DUST_SPECS.map((d, i) => {
          const drift = Math.sin(progress * Math.PI * 4 + d.r * 3) * 2.5
          return (
            <circle
              key={`dust-${i}`}
              cx={width * d.x + drift}
              cy={height * d.y - drift * 0.6}
              r={0.6 + (i % 3) * 0.25}
              fill={WARM}
              opacity={0.12 + (Math.sin(progress * 10 + i) * 0.5 + 0.5) * 0.2}
            />
          )
        })}
      </g>

      {/* Bulb (phase 0) */}
      <g transform={`translate(${depthShift(0, parallax)} 0)`}>
        <circle cx={bulbX} cy={bulbY + height * 0.12} r={width * 0.42 * bulbOn} fill="url(#ws-bulb-glow)" opacity={bulbOn * 0.8} />
        <line x1={bulbX} y1={0} x2={bulbX} y2={bulbY - 6} stroke={INK} strokeWidth={1.2} opacity={0.5 * bulbOn} />
        <g transform={`translate(${bulbX} ${bulbY})`} opacity={bulbOn} filter="url(#ws-soft-shadow)">
          <circle r={18 + bulbOn * 10} fill={CORAL} opacity={0.05 + bulbOn * 0.12} />
          <ellipse rx={9} ry={11} fill={WARM} opacity={0.35 + bulbOn * 0.55} />
          <path d="M -5 9 Q 0 16 5 9" stroke={INK} strokeWidth={1.3} fill="none" opacity={0.6} />
        </g>
      </g>

      {/* Mid layer — globe & books */}
      <g transform={`translate(${depthShift(1, parallax)} 0)`}>
        {/* Top-centre floating open book */}
        {floatBook > 0.02 ? (
          <g transform={`translate(${cx} ${topBookY})`} opacity={floatBook * 0.9}>
            <g transform="rotate(-8)">
              <rect x={-16} y={-3} width={32} height={6} rx={1} fill="url(#ws-page-edge)" />
              <path d="M 0 -3 L 0 3" stroke={INK} strokeWidth={0.8} opacity={0.35} />
              <path
                d="M -28 10 Q -8 2 12 8 Q 18 14 8 18 Q -12 16 -28 10"
                fill="none"
                stroke={CORAL}
                strokeWidth={1.3}
                opacity={0.35 + phase2 * 0.35}
              />
            </g>
          </g>
        ) : null}

        {/* Globe */}
        {globeIn > 0.02 ? (
          <g transform={`translate(${cx} ${globeY})`} opacity={globeIn}>
            <ellipse
              rx={globeR + 10}
              ry={globeR * 0.32}
              fill="none"
              stroke={CORAL}
              strokeWidth={0.9}
              opacity={0.22 + phase2 * 0.3}
              transform={`rotate(${progress * 18})`}
            />
            <circle r={globeR + 3} fill={INK} opacity={0.45} />
            <circle r={globeR} fill="#141c28" stroke={WARM} strokeWidth={0.5} strokeOpacity={0.3} />
            <g clipPath="url(#ws-globe-clip)">
              <path
                d={`M ${-globeR} 0 Q 0 ${-globeR * 0.35} ${globeR} 0`}
                fill="#1a2838"
                opacity={0.7}
              />
              <path
                d={`M ${-globeR * 0.65} ${globeR * 0.15} Q 0 ${globeR * 0.48} ${globeR * 0.55} ${globeR * 0.12}`}
                fill="#1a2838"
                opacity={0.65}
              />
              {lights.map((light, i) => {
                const pt = projectGlobePoint(light.lat, light.lng, 0, 0, globeR * 0.88, globeSpin)
                if (!pt.visible) return null
                const lit = welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 4 + i)
                return (
                  <circle
                    key={`${light.code}-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={light.decorative ? 1.8 : 2.4}
                    fill={CORAL}
                    opacity={0.25 + lit * 0.75}
                  />
                )
              })}
            </g>
          </g>
        ) : null}

        {/* Lower-centre book stack */}
        {phase2 > 0 ? (
          <g
            transform={`translate(${cx} ${height * 0.72})`}
            opacity={welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 3)}
          >
            <rect x={-36} y={6} width={72} height={10} rx={1} fill="url(#ws-leather)" filter="url(#ws-soft-shadow)" />
            <rect x={-34} y={-6} width={68} height={10} rx={1} fill="url(#ws-leather)" />
            <g transform={`rotate(${-pageTurn * 0.35} -28 -2)`}>
              <path
                d="M -28 -2 L -28 -14 Q -10 -18 6 -10 L 6 -2 Z"
                fill="url(#ws-page-edge)"
                opacity={0.85}
              />
            </g>
            {[0, 1, 2].map((pg) => (
              <rect
                key={pg}
                x={-28 + pg * 2}
                y={-4 + pg}
                width={52 - pg * 3}
                height={1.2}
                fill="#f0e8dc"
                opacity={0.5}
              />
            ))}
          </g>
        ) : null}
      </g>

      {/* Front layer */}
      <g transform={`translate(${depthShift(2, parallax)} 0)`}>
        {/* Top-right quill trail */}
        {phase2 > 0 ? (
          <g
            transform={`translate(${width * 0.82} ${height * 0.16}) rotate(24)`}
            opacity={welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 1)}
          >
            <path
              d={`M 0 0 Q -40 36 -90 70`}
              fill="none"
              stroke={CORAL}
              strokeWidth={1.4}
              strokeDasharray="140"
              strokeDashoffset={140 * (1 - welcomeSceneEase(phase2))}
              opacity={0.4 + phase2 * 0.45}
              strokeLinecap="round"
            />
            <path d="M -2 14 L 0 -16 L 2 14 Z" fill={INK} opacity={0.7} />
          </g>
        ) : null}

        {/* Script title + pen (phase 1) */}
        <g opacity={0.4 + titleWrite * 0.6} filter="url(#ws-title-glow)">
          <text
            x={titleX}
            y={titleY}
            fill={CORAL}
            fontFamily="'Dancing Script', cursive"
            fontSize={titleFontSize}
            clipPath="url(#ws-title-clip)"
          >
            {TITLE}
          </text>
          {titleWrite > 0.03 ? (
            <g transform={`translate(${penX} ${penY})`} filter="url(#ws-soft-shadow)">
              <rect x={-2.5} y={-22} width={5} height={18} rx={2} fill="url(#ws-nib)" />
              <path d="M -1.5 4 L 0 12 L 1.5 4" fill={INK} opacity={0.75} />
              <circle cx={0} cy={14} r={2.2} fill={CORAL} opacity={0.9} />
            </g>
          ) : null}
        </g>

        {/* Lower-left drifting quill + lit trail */}
        {phase2 > 0 ? (
          <g transform={`translate(${driftX} ${driftY}) rotate(-12)`} opacity={driftQuillT}>
            <path
              d="M -90 24 Q -42 6 0 0"
              fill="none"
              stroke={CORAL}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeDasharray="120"
              strokeDashoffset={120 * (1 - trailLit)}
              opacity={0.15 + trailLit * 0.55}
            />
            <path d="M 0 0 Q 34 16 68 0" fill="none" stroke={CORAL} strokeWidth={1.6} opacity={0.35} strokeLinecap="round" />
            <path d="M -2 14 L 0 -16 L 2 14 Z" fill={INK} opacity={0.6} filter="url(#ws-soft-shadow)" />
          </g>
        ) : null}

        {/* Equaliser (lower-right) */}
        <g
          transform={`translate(${width * 0.78} ${height * 0.66})`}
          opacity={welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS, 5)}
        >
          {Array.from({ length: 7 }).map((_, i) => {
            const mid = 3
            const h = 5 + Math.abs(i - mid) * 2 + waveAmp * (16 - Math.abs(i - mid) * 2.5)
            return (
              <rect
                key={i}
                x={i * 5.5 - 16.5}
                y={-h / 2}
                width={3.2}
                height={h}
                rx={1.4}
                fill={CORAL}
                opacity={0.2 + waveAmp * 0.55}
              />
            )
          })}
        </g>

        {/* Bottom-left parchment */}
        <g
          transform={`translate(${width * 0.1} ${height * 0.78}) scale(${0.25 + welcomeSceneEase(phase1) * 0.75}, 1)`}
          opacity={0.35 + phase2 * 0.45}
        >
          <rect width={width * 0.38} height={28} rx={2} fill="url(#ws-parchment)" filter="url(#ws-soft-shadow)" />
          <path
            d={`M 8 16 Q ${width * 0.15} 8 ${width * 0.22} 20`}
            fill="none"
            stroke={CORAL}
            strokeWidth={1.2}
            strokeDasharray="80"
            strokeDashoffset={80 * (1 - welcomeSceneEase(phase2))}
            opacity={0.35 + phase2 * 0.4}
          />
        </g>

        {/* Bottom-right ink drops */}
        {[0, 1].map((i) => {
          const t = welcomeSceneStagger(elapsed, WELCOME_PHASE1_END_MS + 400, i + 7)
          return (
            <circle
              key={`drop-${i}`}
              cx={width * (0.86 + i * 0.05)}
              cy={height * (0.8 + i * 0.03)}
              r={2.5 + t * 7}
              fill={CORAL}
              opacity={0.08 + t * 0.22}
            />
          )
        })}
      </g>

      {quote && quoteFade > 0.02 ? (
        <text
          x={cx}
          y={height * 0.9}
          textAnchor="middle"
          fill={QUOTE_INK}
          fontFamily="Georgia, serif"
          fontSize={14}
          fontStyle="italic"
          opacity={quoteFade}
        >
          {quote.text.length > 72 ? `${quote.text.slice(0, 69)}…` : quote.text}
        </text>
      ) : null}

      <rect width={width} height={height} fill="url(#ws-vignette)" pointerEvents="none" />
      <rect width={width} height={height} filter="url(#ws-grain)" opacity={0.85} pointerEvents="none" />
    </svg>
  )
}
