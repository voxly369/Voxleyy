import { focusRing } from './navItems.ts'

export function SkipLink() {
  return (
    <a
      href="#main"
      className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-2xl focus:bg-surface focus:px-4 focus:font-semibold focus:text-ink ${focusRing}`}
    >
      Skip to content
    </a>
  )
}
