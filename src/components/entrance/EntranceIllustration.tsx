type EntranceIllustrationProps = {
  reducedMotion: boolean
  palette: 'dawn' | 'day' | 'dusk' | 'night'
}

const PALETTE = {
  dawn: { glow: '#f4c4a8', sky: '#e8d5c4', ink: '#5c4a42' },
  day: { glow: '#c9e4de', sky: '#f0f4f8', ink: '#3d4f5f' },
  dusk: { glow: '#d4a5a5', sky: '#c9b8a8', ink: '#4a3f55' },
  night: { glow: '#8b9dc3', sky: '#1a1f2e', ink: '#c8d0e0' },
} as const

export function EntranceIllustration({ reducedMotion, palette }: EntranceIllustrationProps) {
  const colors = PALETTE[palette]
  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label=""
      className="mx-auto h-auto w-full max-w-xs"
      data-testid="entrance-illustration"
    >
      <title>Voxly</title>
      <rect width="320" height="200" fill={colors.sky} rx="16" />
      {!reducedMotion ? (
        <>
          <circle cx="160" cy="100" r="48" fill={colors.glow} opacity="0.45">
            <animate attributeName="r" values="44;52;44" dur="6s" repeatCount="indefinite" />
          </circle>
          <g opacity="0.35">
            <circle cx="80" cy="40" r="2" fill={colors.ink}>
              <animate attributeName="cy" values="40;120;40" dur="14s" repeatCount="indefinite" />
            </circle>
            <circle cx="240" cy="60" r="1.5" fill={colors.ink}>
              <animate attributeName="cy" values="60;130;60" dur="11s" repeatCount="indefinite" />
            </circle>
          </g>
        </>
      ) : (
        <circle cx="160" cy="100" r="48" fill={colors.glow} opacity="0.45" />
      )}
      <g transform="translate(160 95)">
        <path
          d="M-8 28 L0 -32 L8 28 Z"
          fill={colors.ink}
          opacity="0.85"
          transform={reducedMotion ? undefined : 'rotate(-6)'}
        >
          {!reducedMotion ? (
            <animateTransform attributeName="transform" type="rotate" values="-6 0 0;6 0 0;-6 0 0" dur="5s" repeatCount="indefinite" />
          ) : null}
        </path>
        <ellipse cx="0" cy="32" rx="14" ry="3" fill={colors.ink} opacity="0.2" />
      </g>
      <text x="160" y="178" textAnchor="middle" fill={colors.ink} fontFamily="Georgia, serif" fontSize="22" fontWeight="600">
        Voxly
      </text>
    </svg>
  )
}

export function entrancePaletteForHour(hour: number): EntranceIllustrationProps['palette'] {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'dusk'
  return 'night'
}
