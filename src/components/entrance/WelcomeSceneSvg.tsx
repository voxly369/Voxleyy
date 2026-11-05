import { globeLightsForCountryCodes, projectGlobePoint, type GlobeLight } from '../../lib/entrance/countryGlobeLights.ts'
import { welcomeSceneEase } from '../../lib/entrance/welcomeSceneTiming.ts'

const CORAL = '#FF5A3C'
const INK = '#2a3140'
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

const VOXLY_INK_PATH =
  'M 48 210 Q 55 195 70 200 Q 85 205 95 195 Q 110 180 130 188 Q 150 196 165 185 Q 180 174 200 182 Q 220 190 235 178 Q 250 166 270 175 Q 285 182 300 170'

const VOXLY_TEXT_PATH =
  'M 72 248 Q 88 228 108 242 Q 118 250 132 238 Q 148 224 168 236 Q 188 248 208 232 Q 228 216 248 228 Q 268 240 288 224 Q 304 212 322 226'

function layerShift(depth: number, parallax: number, amount: number): number {
  return parallax * depth * amount
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
  const p = welcomeSceneEase(progress)
  const lights: GlobeLight[] = globeLightsForCountryCodes(countryCodes)
  const globeSpin = progress * Math.PI * 0.9
  const cx = width / 2
  const cy = height * 0.42
  const globeR = Math.min(width, height) * 0.14

  const penT = welcomeSceneEase(Math.min(1, progress / 0.38))
  const quillT = welcomeSceneEase(Math.max(0, (progress - 0.08) / 0.45))
  const bookT = welcomeSceneEase(Math.max(0, (progress - 0.12) / 0.5))
  const bulbT = welcomeSceneEase(Math.max(0, (progress - 0.2) / 0.55))
  const paperT = welcomeSceneEase(Math.min(1, progress / 0.35))
  const quoteIn = welcomeSceneEase(Math.max(0, (progress - 0.42) / 0.12))
  const quoteOut = 1 - welcomeSceneEase(Math.max(0, (progress - 0.72) / 0.18))
  const quoteOpacity = quote ? Math.min(quoteIn, quoteOut) : 0

  const waveAmp = musicPulse ? 0.55 + 0.45 * Math.sin(progress * Math.PI * 6) : 0.35 + progress * 0.2
  const pathLen = 320

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-hidden="true"
      data-testid="entrance-illustration"
      className="block size-full"
    >
      <defs>
        <radialGradient id="welcome-warm-glow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={WARM} stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0f1218" stopOpacity="0" />
        </radialGradient>
        <filter id="welcome-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.04" />
          </feComponentTransfer>
        </filter>
        <clipPath id="welcome-globe-clip">
          <circle cx={cx} cy={cy} r={globeR} />
        </clipPath>
      </defs>

      <rect width={width} height={height} fill="#0f1218" />
      <rect width={width} height={height} fill="url(#welcome-warm-glow)" />
      <rect width={width} height={height} filter="url(#welcome-grain)" opacity="0.9" />

      {/* Paper unroll */}
      <g
        style={{
          transform: `translate(${layerShift(0.15, parallax, 24)}px, ${height * 0.62}px) scaleX(${0.15 + paperT * 0.85})`,
          transformOrigin: 'left center',
        }}
        opacity={0.35 + paperT * 0.45}
      >
        <rect x={width * 0.08} y={-18} width={width * 0.55} height={36} rx={4} fill="#e8e0d4" />
        <line x1={width * 0.12} y1={-8} x2={width * 0.55} y2={-8} stroke={INK} strokeOpacity={0.15} />
        <line x1={width * 0.12} y1={4} x2={width * 0.5} y2={4} stroke={INK} strokeOpacity={0.12} />
      </g>

      {/* Ink blooms */}
      {[0.18, 0.32, 0.48].map((start, i) => {
        const t = welcomeSceneEase(Math.max(0, (progress - start) / 0.22))
        const bx = width * (0.22 + i * 0.22) + layerShift(0.25 + i * 0.1, parallax, 18)
        const by = height * (0.58 + i * 0.04)
        return (
          <circle
            key={`bloom-${i}`}
            cx={bx}
            cy={by}
            r={4 + t * 22}
            fill={CORAL}
            opacity={0.08 + t * 0.22}
          />
        )
      })}

      {/* Books */}
      <g
        style={{
          transform: `translate(${cx - 40 + layerShift(0.35, parallax, 20)}px, ${height * 0.52 - bookT * 40}px)`,
        }}
        opacity={0.5 + bookT * 0.5}
      >
        <rect x={0} y={20} width={36} height={10} rx={1} fill={INK} opacity={0.55} />
        <rect x={4} y={10} width={36} height={10} rx={1} fill={INK} opacity={0.65} />
        <g
          style={{
            transform: `rotate(${-8 + bookT * 14}deg)`,
            transformOrigin: '20px 0px',
          }}
        >
          <rect x={8} y={-2} width={38} height={12} rx={1} fill={INK} opacity={0.75} />
          {[0, 1, 2].map((pg) => (
            <path
              key={pg}
              d={`M 42 ${pg * 2} Q 58 ${-4 + pg * 3 + bookT * 6} 52 ${8 + pg * 2}`}
              fill="none"
              stroke="#e8e0d4"
              strokeWidth={1.2}
              opacity={0.35 + bookT * 0.45}
            />
          ))}
        </g>
      </g>

      {/* Globe */}
      <g style={{ transform: `translate(${layerShift(0.5, parallax, 16)}px, 0px)` }}>
        <circle cx={cx} cy={cy} r={globeR + 2} fill={INK} opacity={0.35} />
        <circle cx={cx} cy={cy} r={globeR} fill="#1a2333" stroke={INK} strokeWidth={1} opacity={0.8} />
        <g clipPath="url(#welcome-globe-clip)">
          {Array.from({ length: 5 }).map((_, i) => (
            <ellipse
              key={`lat-${i}`}
              cx={cx}
              cy={cy}
              rx={globeR}
              ry={globeR * (0.25 + i * 0.18)}
              fill="none"
              stroke={INK}
              strokeOpacity={0.25}
            />
          ))}
          {lights.map((light, i) => {
            const pt = projectGlobePoint(light.lat, light.lng, cx, cy, globeR * 0.92, globeSpin)
            if (!pt.visible) return null
            const lit = welcomeSceneEase(Math.max(0, (progress - 0.15 - i * 0.04) / 0.35))
            return (
              <circle
                key={`${light.code}-${i}`}
                cx={pt.x}
                cy={pt.y}
                r={light.decorative ? 2.2 : 3}
                fill={CORAL}
                opacity={0.25 + lit * 0.75}
              />
            )
          })}
        </g>
      </g>

      {/* Lamps */}
      {[
        { x: width * 0.12, y: height * 0.22, d: 0.05 },
        { x: width * 0.88, y: height * 0.28, d: 0.12 },
        { x: width * 0.78, y: height * 0.72, d: 0.18 },
        { x: width * 0.18, y: height * 0.78, d: 0.24 },
      ].map((lamp, i) => {
        const on = welcomeSceneEase(Math.max(0, (bulbT - lamp.d) / 0.35))
        return (
          <g key={`lamp-${i}`}>
            <circle cx={lamp.x} cy={lamp.y} r={28 + on * 18} fill={CORAL} opacity={0.04 + on * 0.1} />
            <path
              d={`M ${lamp.x - 6} ${lamp.y + 8} L ${lamp.x} ${lamp.y - 6} L ${lamp.x + 6} ${lamp.y + 8} Z`}
              fill={WARM}
              opacity={0.25 + on * 0.55}
            />
            <rect x={lamp.x - 4} y={lamp.y + 8} width={8} height={4} rx={1} fill={INK} opacity={0.5} />
          </g>
        )
      })}

      {/* Main bulb */}
      <g style={{ transform: `translate(${width * 0.72 + layerShift(0.4, parallax, 12)}px, ${height * 0.18}px)` }}>
        <circle r={36} fill={CORAL} opacity={0.06 + bulbT * 0.14} />
        <circle r={14} fill={WARM} opacity={0.35 + bulbT * 0.6} />
        <path d="M -5 10 Q 0 18 5 10" stroke={INK} strokeWidth={1.5} fill="none" opacity={0.6} />
      </g>

      {/* Sound wave + mic */}
      <g
        style={{
          transform: `translate(${cx + layerShift(0.45, parallax, 14)}px, ${height * 0.68}px)`,
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const mid = 4
          const h = 8 + Math.abs(i - mid) * 3 + waveAmp * (12 - Math.abs(i - mid) * 2)
          return (
            <rect
              key={`wave-${i}`}
              x={i * 7 - 28}
              y={-h / 2}
              width={4}
              height={h}
              rx={2}
              fill={CORAL}
              opacity={0.25 + waveAmp * 0.45}
            />
          )
        })}
        <rect x={-5} y={-10} width={10} height={14} rx={4} fill={INK} opacity={0.65} />
        <path d="M -9 6 Q 0 14 9 6" stroke={INK} strokeWidth={1.2} fill="none" opacity={0.55} />
      </g>

      {/* Quills */}
      {[
        { fromX: -40, fromY: height * 0.35, toX: width * 0.28, toY: height * 0.38, trail: 'M 0 0 Q 40 20 80 5' },
        { fromX: width + 30, fromY: height * 0.42, toX: width * 0.62, toY: height * 0.36, trail: 'M 0 0 Q -30 25 -70 8' },
        { fromX: -30, fromY: height * 0.62, toX: width * 0.38, toY: height * 0.55, trail: 'M 0 0 Q 50 -10 90 12' },
      ].map((q, i) => {
        const t = welcomeSceneEase(Math.max(0, quillT - i * 0.08))
        const x = q.fromX + (q.toX - q.fromX) * t
        const y = q.fromY + (q.toY - q.fromY) * t
        return (
          <g key={`quill-${i}`} transform={`translate(${x + layerShift(0.3, parallax, 10)} ${y}) rotate(${-25 + i * 15})`}>
            <path d={q.trail} stroke={CORAL} strokeWidth={2} fill="none" opacity={0.15 + t * 0.35} strokeLinecap="round" />
            <path d="M -2 12 L 0 -14 L 2 12 Z" fill={INK} opacity={0.55 + t * 0.35} />
          </g>
        )
      })}

      {/* Pen + ink loop + handwriting */}
      <g
        style={{
          transform: `translate(${width * 0.18 + penT * width * 0.08 + layerShift(0.55, parallax, 22)}px, ${height * 0.32 + penT * 8}px) rotate(${-12 + penT * 6}deg)`,
        }}
      >
        <ellipse cx={0} cy={-30} rx={38 + penT * 10} ry={22 + penT * 6} fill="none" stroke={CORAL} strokeWidth={2} opacity={0.2 + penT * 0.45} />
        <path
          d={VOXLY_INK_PATH}
          fill="none"
          stroke={CORAL}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={pathLen * (1 - penT)}
          opacity={0.5 + penT * 0.5}
        />
        <path
          d={VOXLY_TEXT_PATH}
          fill="none"
          stroke={CORAL}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={pathLen * (1 - Math.min(1, penT * 1.15))}
          opacity={0.65 + penT * 0.35}
        />
        <path d="M -4 18 L 0 -22 L 4 18 Z" fill={INK} opacity={0.75} />
        <circle cx={0} cy={20} r={3} fill={CORAL} opacity={0.8} />
      </g>

      {quote && quoteOpacity > 0.02 ? (
        <g opacity={quoteOpacity}>
          <text
            x={cx}
            y={height * 0.88}
            textAnchor="middle"
            fill="#c8d0e0"
            fontFamily="Georgia, serif"
            fontSize={14}
            fontStyle="italic"
          >
            {quote.text.length > 72 ? `${quote.text.slice(0, 69)}…` : quote.text}
          </text>
          <text x={cx} y={height * 0.92} textAnchor="middle" fill={CORAL} fontSize={11} opacity={0.85}>
            — {quote.author}
          </text>
        </g>
      ) : null}

      <text
        x={cx}
        y={height * 0.96}
        textAnchor="middle"
        fill={CORAL}
        fontFamily="Georgia, serif"
        fontSize={22}
        fontWeight={600}
        opacity={0.35 + p * 0.65}
      >
        Voxly
      </text>
    </svg>
  )
}
