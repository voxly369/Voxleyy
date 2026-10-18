import { useState, type ReactNode } from 'react'

type ImageWithFallbackProps = {
  src?: string
  alt: string
  label?: string
  icon?: ReactNode
  className?: string
}

export function ImageWithFallback({ src, alt, label, icon, className }: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined)
  const failed = Boolean(src) && failedSrc === src
  const showImage = Boolean(src) && !failed
  const source = (label ?? alt).trim()
  const letter = source ? source.charAt(0).toUpperCase() : ''

  return (
    <div
      className={`relative inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-coral ${className ?? ''}`}
    >
      <span className="font-serif text-2xl" aria-hidden="true">
        {icon ?? letter}
      </span>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        alt ? <span className="sr-only">{alt}</span> : null
      )}
    </div>
  )
}
