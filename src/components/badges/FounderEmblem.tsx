export type FounderEmblemSize = 'sm' | 'md' | 'lg'

const SIZE_PX: Record<FounderEmblemSize, number> = {
  sm: 14,
  md: 22,
  lg: 48,
}

type FounderEmblemProps = {
  size?: FounderEmblemSize
  shimmer?: boolean
  className?: string
}

/** Gold–amber crest with quill and laurel — distinct from the coral Verified seal. */
export function FounderEmblem({ size = 'sm', shimmer = false, className = '' }: FounderEmblemProps) {
  const px = SIZE_PX[size]
  return (
    <span
      role="img"
      aria-label="Founder"
      className={`relative inline-block shrink-0 overflow-hidden rounded-full align-middle ${className}`}
      style={{ width: px, height: px, lineHeight: 0 }}
    >
      {shimmer ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 motion-reduce:hidden"
          style={{
            background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,.45) 50%, transparent 65%)',
            animation: 'shimmer 2.8s ease-in-out infinite',
          }}
        />
      ) : null}
      <svg viewBox="0 0 24 24" width={px} height={px} aria-hidden="true" className="block">
        <defs>
          <linearGradient id="founder-crest" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5D278" />
            <stop offset="55%" stopColor="#E8A317" />
            <stop offset="100%" stopColor="#C77800" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10.5" fill="url(#founder-crest)" stroke="#FFF3C4" strokeWidth="0.6" />
        <path
          fill="#5C3D0A"
          d="M11.2 6.2c.3-.8 1.3-.8 1.6 0l.35 1.05h1.1c.85 0 1.2 1.1.55 1.6l-.9.65.35 1.05c.25.75-.65 1.35-1.3.9l-.9-.65-.9.65c-.65.45-1.55-.15-1.3-.9l.35-1.05-.9-.65c-.65-.5-.3-1.6.55-1.6h1.1L11.2 6.2Z"
          opacity="0.15"
        />
        <path
          fill="#3D2506"
          d="M8.5 15.2c1.2-2.2 3.2-3.4 5.5-3.4 1.1 0 2 .25 2.8.7-.9.9-2.1 1.4-3.4 1.4-1.5 0-2.9-.55-4-1.5-.3.55-.6 1.05-.9 1.5Z"
        />
        <path
          fill="#3D2506"
          d="M12 7.8l1.2 4.2 3.8.3-2.9 2.2 1.1 4.1L12 16.8l-3.2 2.8 1.1-4.1-2.9-2.2 3.8-.3L12 7.8Z"
        />
        <path
          fill="none"
          stroke="#FFF8E7"
          strokeWidth="0.5"
          d="M6.5 13.5c1.2 1.8 3.2 2.9 5.5 2.9s4.3-1.1 5.5-2.9"
        />
      </svg>
    </span>
  )
}
