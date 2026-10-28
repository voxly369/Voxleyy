import { useRef, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { followUser, unfollowUser } from '../../lib/profiles/api.ts'

type FollowButtonProps = {
  userId: string
  username: string
  following: boolean
  onChange: (following: boolean) => void
}

export function FollowButton({ userId, username, following, onChange }: FollowButtonProps) {
  const [pending, setPending] = useState(false)
  const [armed, setArmed] = useState(false)
  const [hover, setHover] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const confirm = following && (hover || armed)
  const label = !following ? 'Follow' : confirm ? 'Unfollow' : 'Following'

  async function run(next: boolean) {
    if (lock.current) return
    lock.current = true
    setPending(true)
    setError('')
    onChange(next)
    try {
      const result = next ? await followUser(userId) : await unfollowUser(userId)
      if (!result.ok) {
        onChange(!next)
        setError(result.error.message)
        return
      }
      setArmed(false)
    } catch {
      onChange(!next)
      setError(next ? 'Could not follow. Try again.' : 'We could not unfollow this person. Try again.')
    } finally {
      setPending(false)
      lock.current = false
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        aria-pressed={following}
        aria-label={confirm ? `Unfollow @${username}` : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHover(true)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setHover(false)
        }}
        onBlur={() => setArmed(false)}
        onClick={() => {
          if (!following) {
            void run(true)
            return
          }
          if (confirm) {
            void run(false)
            return
          }
          setArmed(true)
        }}
        className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-base font-semibold disabled:opacity-60 ${confirm ? 'bg-coral text-white' : following ? 'border border-line bg-surface text-ink' : 'bg-ink text-bg'} ${focusRing}`}
      >
        {pending ? 'Please wait…' : label}
      </button>
      {error ? (
        <p role="alert" aria-live="polite" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
    </div>
  )
}
