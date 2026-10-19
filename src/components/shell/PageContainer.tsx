import type { ReactNode } from 'react'

export type PageContainerVariant = 'feed' | 'wide' | 'reading' | 'editor'

const variantClass: Record<PageContainerVariant, string> = {
  feed: 'mx-auto w-full max-w-[37.5rem]',
  wide: 'mx-auto w-full max-w-[68.75rem]',
  reading: 'mx-auto w-full max-w-[65ch]',
  editor: 'mx-auto w-full max-w-[68.75rem]',
}

type PageContainerProps = {
  variant?: PageContainerVariant
  className?: string
  children: ReactNode
}

export function PageContainer({ variant = 'feed', className = '', children }: PageContainerProps) {
  return (
    <div className={`px-4 md:px-6 ${variantClass[variant]} ${className}`.trim()}>{children}</div>
  )
}
