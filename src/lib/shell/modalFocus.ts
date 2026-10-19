export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
  )
}

export function focusFirstFocusable(container: HTMLElement | null) {
  const focusables = getFocusableElements(container)
  if (focusables.length > 0) {
    focusables[0].focus()
    return
  }
  container?.focus()
}

import { VOXLY_APP_ROOT_ID } from './modalStackContext.ts'

export function handleModalTabTrap(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== 'Tab' || !container) return
  const focusables = getFocusableElements(container)
  if (focusables.length === 0) {
    event.preventDefault()
    container.focus()
    return
  }
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement
  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault()
      last.focus()
    }
  } else if (active === last) {
    event.preventDefault()
    first.focus()
  }
}

/** Test-only reset for module-level scroll lock state. */
export function resetModalStackForTests() {
  document.body.style.overflow = ''
  const root = document.getElementById(VOXLY_APP_ROOT_ID)
  if (root) {
    root.removeAttribute('inert')
    root.removeAttribute('aria-hidden')
  }
}
