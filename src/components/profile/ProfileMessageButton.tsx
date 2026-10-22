import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { canUserMessage, getOrCreateDm } from '../../lib/messages/api.ts'

type ProfileMessageButtonProps = {
  userId: string
  className?: string
}

export function ProfileMessageButton({ userId, className = '' }: ProfileMessageButtonProps) {
  const navigate = useNavigate()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void canUserMessage(userId).then((result) => {
      if (cancelled) return
      setAllowed(result.ok ? result.data : false)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function onClick() {
    if (!allowed || pending) return
    setPending(true)
    setError('')
    const result = await getOrCreateDm(userId)
    setPending(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    navigate(`/messages/${result.data}`)
  }

  if (allowed === false) return null

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending || allowed === null}
        data-testid="profile-message-button"
        className={`inline-flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink disabled:opacity-60 ${focusRing}`}
      >
        {pending ? 'Opening…' : 'Message'}
      </button>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-coral">
          {error}
        </p>
      ) : null}
    </div>
  )
}
