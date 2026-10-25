import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ConfirmDialog } from '../states/ConfirmDialog.tsx'
import { focusRing } from '../shell/navItems.ts'
import { MoreIcon } from '../icons/MoreIcon.tsx'
import { blockUser } from '../../lib/safety/blocksApi.ts'
import { muteUser } from '../../lib/safety/mutesApi.ts'
import { ReportSheet, type ReportSheetTarget } from './ReportSheet.tsx'

export type SafetyMenuSubject = {
  reportedUserId: string
  displayLabel: string
  report: ReportSheetTarget
}

type SafetyOverflowMenuProps = {
  subject: SafetyMenuSubject
  testId?: string
  onAboutProfile?: () => void
}

export function SafetyOverflowMenu({ subject, testId = 'safety-overflow-menu', onAboutProfile }: SafetyOverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [confirmMute, setConfirmMute] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => buttonRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    if (!menu) return
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    items[0]?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
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

  async function onBlockConfirm() {
    setBusy(true)
    const result = await blockUser(subject.reportedUserId)
    setBusy(false)
    setConfirmBlock(false)
    close()
    setMessage(result.ok ? 'Account blocked.' : result.error.message)
  }

  async function onMuteConfirm() {
    setBusy(true)
    const result = await muteUser(subject.reportedUserId)
    setBusy(false)
    setConfirmMute(false)
    close()
    setMessage(result.ok ? 'Account muted.' : result.error.message)
  }

  return (
    <>
      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          type="button"
          data-testid={`${testId}-trigger`}
          aria-label="Safety options"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full text-muted ${focusRing}`}
        >
          <MoreIcon filled={open} className="size-5" />
        </button>
        {open ? (
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Safety options"
            className="absolute right-0 z-30 mt-1 w-48 rounded-2xl border border-line bg-surface p-2 shadow-lg"
          >
            {onAboutProfile ? (
              <button
                type="button"
                role="menuitem"
                className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base text-ink ${focusRing}`}
                onClick={() => {
                  close()
                  onAboutProfile()
                }}
              >
                About this profile
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base text-ink ${focusRing}`}
              onClick={() => {
                close()
                setReportOpen(true)
              }}
            >
              Report
            </button>
            <button
              type="button"
              role="menuitem"
              className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base text-ink ${focusRing}`}
              onClick={() => {
                close()
                setConfirmBlock(true)
              }}
            >
              Block
            </button>
            <button
              type="button"
              role="menuitem"
              className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base text-ink ${focusRing}`}
              onClick={() => {
                close()
                setConfirmMute(true)
              }}
            >
              Mute
            </button>
          </div>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="sr-only">
          {message}
        </p>
      ) : null}
      <ReportSheet open={reportOpen} target={subject.report} onClose={() => setReportOpen(false)} />
      <ConfirmDialog
        open={confirmBlock}
        title="Block this account?"
        message="You will not see their posts or profile, and they cannot message you."
        confirmLabel="Block"
        busy={busy}
        onCancel={() => setConfirmBlock(false)}
        onConfirm={() => void onBlockConfirm()}
      />
      <ConfirmDialog
        open={confirmMute}
        title="Mute this account?"
        message="Their posts and comments will be hidden from your feed without notifying them."
        confirmLabel="Mute"
        busy={busy}
        onCancel={() => setConfirmMute(false)}
        onConfirm={() => void onMuteConfirm()}
      />
    </>
  )
}
