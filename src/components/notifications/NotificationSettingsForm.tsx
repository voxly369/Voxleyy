import { useEffect, useRef, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import {
  fetchNotificationSettings,
  updateNotificationSettings,
} from '../../lib/notifications/api.ts'
import type { NotificationSettings } from '../../lib/notifications/types.ts'
import type { NotificationSettingsPatch } from '../../lib/notifications/settingsSchema.ts'

const AUTOSAVE_MS = 600

type FormState = NotificationSettingsPatch & { userId?: string }

function toPatch(settings: NotificationSettings): FormState {
  return {
    notify_likes: settings.notifyLikes,
    notify_comments: settings.notifyComments,
    notify_follows: settings.notifyFollows,
    notify_mentions: settings.notifyMentions,
    notify_messages: settings.notifyMessages,
    notify_sales: settings.notifySales,
    notify_chapters: settings.notifyChapters,
    notify_announcements: settings.notifyAnnouncements,
    quiet_enabled: settings.quietEnabled,
    quiet_manual: settings.quietManual,
    quiet_schedule_start: settings.quietScheduleStart,
    quiet_schedule_end: settings.quietScheduleEnd,
    quiet_reach: settings.quietReach,
    timezone: settings.timezone,
    show_local_time: settings.showLocalTime,
    digest_enabled: settings.digestEnabled,
    digest_time: settings.digestTime,
  }
}

export function NotificationSettingsForm() {
  const [form, setForm] = useState<FormState | null>(null)
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<number | null>(null)
  const skipSave = useRef(true)

  useEffect(() => {
    void fetchNotificationSettings().then((result) => {
      if (!result.ok) {
        setError(result.error.message)
        setStatus('error')
        return
      }
      setForm(toPatch(result.data))
      setStatus('idle')
      skipSave.current = true
    })
  }, [])

  useEffect(() => {
    if (!form || skipSave.current) {
      skipSave.current = false
      return
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      setStatus('saving')
      void updateNotificationSettings(form).then((result) => {
        if (!result.ok) {
          setError(result.error.message)
          setStatus('error')
          return
        }
        setError(null)
        setStatus('saved')
        window.setTimeout(() => setStatus('idle'), 1500)
      })
    }, AUTOSAVE_MS)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [form])

  function toggle(key: keyof NotificationSettingsPatch) {
    setForm((prev) => {
      if (!prev) return prev
      const current = prev[key]
      return { ...prev, [key]: typeof current === 'boolean' ? !current : current }
    })
  }

  if (status === 'loading' || !form) {
    return <p className="text-sm text-muted">Loading notification settings…</p>
  }

  return (
    <form className="flex flex-col gap-6" data-testid="notification-settings-form" onSubmit={(e) => e.preventDefault()}>
      <p className="text-sm text-muted" aria-live="polite">
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Changes save automatically.'}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}

      <fieldset className="rounded-2xl border border-line bg-surface p-5">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Activity</legend>
        <ul className="mt-4 flex flex-col gap-3">
          {(
            [
              ['notify_likes', 'Likes'],
              ['notify_comments', 'Comments and replies'],
              ['notify_follows', 'New followers'],
              ['notify_mentions', 'Mentions'],
              ['notify_messages', 'Messages'],
              ['notify_sales', 'Sales'],
              ['notify_chapters', 'New chapters'],
              ['notify_announcements', 'Announcements'],
            ] as const
          ).map(([key, label]) => {
            const inputId = `notify-${key}`
            return (
            <li key={key}>
              <label htmlFor={inputId} className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                <span className="text-base text-ink">{label}</span>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={() => toggle(key)}
                  className="size-5 accent-coral"
                />
              </label>
            </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-5">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Quiet mode</legend>
        <div className="mt-4 flex flex-col gap-3">
          <label htmlFor="notify-quiet-enabled" className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-base text-ink">Scheduled quiet hours</span>
            <input
              id="notify-quiet-enabled"
              type="checkbox"
              checked={Boolean(form.quiet_enabled)}
              onChange={() => toggle('quiet_enabled')}
              className="size-5 accent-coral"
            />
          </label>
          <label htmlFor="notify-quiet-manual" className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-base text-ink">Quiet now</span>
            <input
              id="notify-quiet-manual"
              type="checkbox"
              checked={Boolean(form.quiet_manual)}
              onChange={() => toggle('quiet_manual')}
              className="size-5 accent-coral"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Quiet from</span>
            <input
              type="time"
              value={(form.quiet_schedule_start ?? '').slice(0, 5)}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, quiet_schedule_start: `${event.target.value}:00` } : prev))
              }
              className="min-h-11 rounded-2xl border border-line bg-bg px-3 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Quiet until</span>
            <input
              type="time"
              value={(form.quiet_schedule_end ?? '').slice(0, 5)}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, quiet_schedule_end: `${event.target.value}:00` } : prev))
              }
              className="min-h-11 rounded-2xl border border-line bg-bg px-3 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Who can reach you during quiet</span>
            <select
              value={form.quiet_reach ?? 'everyone'}
              onChange={(event) =>
                setForm((prev) =>
                  prev ? { ...prev, quiet_reach: event.target.value as FormState['quiet_reach'] } : prev,
                )
              }
              className="min-h-11 rounded-2xl border border-line bg-bg px-3 text-base"
            >
              <option value="everyone">Everyone</option>
              <option value="close_contacts">Close contacts</option>
              <option value="pen_pals">Pen pals</option>
              <option value="nobody">Nobody</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-5">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted">Profile & digest</legend>
        <div className="mt-4 flex flex-col gap-3">
          <label htmlFor="notify-show-local-time" className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-base text-ink">Show local time on my profile</span>
            <input
              id="notify-show-local-time"
              type="checkbox"
              checked={Boolean(form.show_local_time)}
              onChange={() => toggle('show_local_time')}
              className="size-5 accent-coral"
            />
          </label>
          <label htmlFor="notify-digest-enabled" className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-base text-ink">Daily digest email</span>
            <input
              id="notify-digest-enabled"
              type="checkbox"
              checked={Boolean(form.digest_enabled)}
              onChange={() => toggle('digest_enabled')}
              className="size-5 accent-coral"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Digest time</span>
            <input
              type="time"
              value={(form.digest_time ?? '').slice(0, 5)}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, digest_time: `${event.target.value}:00` } : prev))
              }
              className="min-h-11 rounded-2xl border border-line bg-bg px-3 text-base"
            />
          </label>
        </div>
      </fieldset>

      <p className="text-xs text-muted">
        Time zone is detected from your device when you first sign up. Adjust it here if you travel often.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Time zone (IANA)</span>
        <input
          value={form.timezone ?? 'UTC'}
          onChange={(event) => setForm((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))}
          className={`min-h-11 rounded-2xl border border-line bg-bg px-3 text-base ${focusRing}`}
          maxLength={64}
        />
      </label>
    </form>
  )
}
