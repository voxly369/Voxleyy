import type { ReactNode } from 'react'

type IconProps = {
  children: ReactNode
  className?: string
}

export function Icon({ children, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      {children}
    </svg>
  )
}
