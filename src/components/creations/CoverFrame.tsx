import { ImageWithFallback } from '../states/ImageWithFallback.tsx'

type CoverFrameProps = {
  src: string
  alt?: string
  label?: string
  className?: string
}

/** 16:9 cover crop, centred focal point. */
export function CoverFrame({ src, alt = '', label = 'Cover', className = '' }: CoverFrameProps) {
  return (
    <div className={`aspect-video w-full overflow-hidden rounded-xl bg-bg ${className}`.trim()}>
      <ImageWithFallback
        src={src}
        alt={alt}
        label={label}
        className="size-full rounded-none"
        imageClassName="object-center"
      />
    </div>
  )
}
