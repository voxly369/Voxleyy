import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { useTheme } from '../../lib/useTheme.ts'
import { focusRing } from './navItems.ts'
import { ThemeChoiceGroup } from './ThemeChoiceGroup.tsx'
import { MoreIcon } from '../icons/MoreIcon.tsx'

type MoreMenuProps = {
  username: string
}

export function MoreMenu({ username }: MoreMenuProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { signOut } = useAuth()
  const { choice, setTheme } = useTheme()
  const navigate = useNavigate()
  const themeLabelId = useId()
  const [signingOut, setSigningOut] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => {
      buttonRef.current?.focus()
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    if (!menu) return
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]'))
    items[0]?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
      const focusables = items.filter((el) => !el.hasAttribute('disabled'))
      if (focusables.length === 0) return
      event.preventDefault()
      const current = document.activeElement instanceof HTMLElement ? focusables.indexOf(document.activeElement) : -1
      let next = current
      if (event.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % focusables.length
      else if (event.key === 'ArrowUp') next = current <= 0 ? focusables.length - 1 : current - 1
      else if (event.key === 'Home') next = 0
      else next = focusables.length - 1
      focusables[next]?.focus()
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (menu!.contains(target) || buttonRef.current?.contains(target)) return
      close()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open, close])

  async function onLogout() {
    setSigningOut(true)
    close()
    await signOut()
    navigate('/login')
  }

  return (
    <div className="relative mt-auto w-full">
      <button
        ref={buttonRef}
        type="button"
        data-testid="more-menu-trigger"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'more-menu' : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`group relative flex min-h-11 w-full justify-center rounded-2xl font-medium text-muted xl:justify-start xl:px-3 ${focusRing}`}
      >
        <span className="inline-flex size-11 items-center justify-center gap-3 text-muted">
          <MoreIcon filled={open} className="size-6 shrink-0" />
          <span className="hidden text-base xl:inline">More</span>
        </span>
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-sm font-medium text-ink shadow-md max-xl:group-focus-within:block max-xl:group-supports-hover:block xl:hidden">
          More
        </span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id="more-menu"
          role="menu"
          aria-label="More"
          className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-lg xl:left-0 xl:w-[calc(100%-0.5rem)] xl:min-w-[14rem]"
        >
          <Link
            role="menuitem"
            to="/library"
            onClick={close}
            className={`flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink ${focusRing}`}
          >
            Library
          </Link>
          <Link
            role="menuitem"
            to={`/u/${username}?tab=drafts`}
            onClick={close}
            className={`flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink ${focusRing}`}
          >
            Drafts
          </Link>
          <Link
            role="menuitem"
            to="/settings"
            onClick={close}
            className={`flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink ${focusRing}`}
          >
            Settings
          </Link>
          <div role="none" className="my-2 border-t border-line" />
          <p id={themeLabelId} className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Switch appearance
          </p>
          <ThemeChoiceGroup
            choice={choice}
            onChange={setTheme}
            labelledBy={themeLabelId}
            compact
          />
          <div role="none" className="my-2 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void onLogout()}
            className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base font-medium text-ink disabled:opacity-60 ${focusRing}`}
          >
            {signingOut ? 'Please wait…' : 'Log out'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
