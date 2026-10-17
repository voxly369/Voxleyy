type SkeletonProps = {
  variant?: 'block' | 'text-lines' | 'circle'
  lines?: number
}

export function Skeleton({ variant = 'block', lines = 3 }: SkeletonProps) {
  if (variant === 'circle') {
    return <div className="skeleton size-16 !rounded-full" aria-hidden="true" />
  }

  if (variant === 'text-lines') {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className={`skeleton h-4 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    )
  }

  return <div className="skeleton h-40 w-full" aria-hidden="true" />
}

export function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton variant="text-lines" lines={2} />
      <Skeleton variant="block" />
    </div>
  )
}
