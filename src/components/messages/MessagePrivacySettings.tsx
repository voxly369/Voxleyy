import { useEffect, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { updateOwnProfile } from '../../lib/profiles/api.ts'
import type { WhoCanMessage } from '../../lib/messages/types.ts'

function parseWhoCanMessage(value: string | undefined): WhoCanMessage {
  if (value === 'followers') return 'followers'
  if (value === 'subscribers') return 'subscribers'
  return 'everyone'
}

export function MessagePrivacySettings() {
  const { profile, refreshProfile } = useAuth()
  const [value, setValue] = useState<WhoCanMessage>('everyone')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!profile) return
    setValue(parseWhoCanMessage(profile.who_can_message))
  }, [profile])

  async function onChange(next: WhoCanMessage) {
    setValue(next)
    setPending(true)
    setError(null)
    setSaved(false)
    const result = await updateOwnProfile({ who_can_message: next })
    setPending(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setSaved(true)
    await refreshProfile()
  }

  return (
    <div className="mt-6" data-testid="message-privacy-settings">
      <h3 className="text-sm font-semibold text-ink">Who can message you</h3>
      <p className="mt-1 text-sm text-muted">
        Safe Space is enforced on the server. Subscribers applies when paid subscriptions launch.
      </p>
      <fieldset className="mt-3 flex flex-col gap-2" disabled={pending}>
        {(
          [
            ['everyone', 'Everyone'],
            ['followers', 'Followers only'],
            ['subscribers', 'Subscribers only'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex min-h-11 items-center gap-3 text-base text-ink">
            <input
              type="radio"
              name="who-can-message"
              value={key}
              checked={value === key}
              onChange={() => void onChange(key)}
              className={`size-5 accent-coral ${focusRing}`}
            />
            {label}
          </label>
        ))}
      </fieldset>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-coral">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="mt-2 text-sm text-ink">
          Privacy saved.
        </p>
      ) : null}
    </div>
  )
}
