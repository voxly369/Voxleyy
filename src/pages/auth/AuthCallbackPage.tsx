import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { focusRing } from '../../components/shell/navItems.ts'
import { supabase } from '../../lib/supabaseClient.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

type CallbackView = 'loading' | 'confirmed' | 'expired'

function callbackType(): { type: string | null; failed: boolean } {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const type = hash.get('type') ?? query.get('type')
  const failed = Boolean(hash.get('error') || query.get('error') || hash.get('error_code') || query.get('error_code'))
  return { type, failed }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const params = callbackType()
  const linkFailed = params.failed
  const linkType = params.type
  const [view, setView] = useState<CallbackView>(linkFailed ? 'expired' : 'loading')
  const title = view === 'expired' ? 'Link expired' : view === 'confirmed' ? 'Email confirmed' : 'Confirming'
  useDocumentTitle(title)

  useEffect(() => {
    if (linkFailed) return

    let settled = false
    const finish = (session: Session | null) => {
      if (settled || !session) return
      settled = true
      if (linkType === 'recovery') {
        navigate('/reset-password', { replace: true })
        return
      }
      setView('confirmed')
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => finish(session), 0)
    })

    void supabase.auth.getSession().then(({ data }) => {
      finish(data.session)
    })

    const timer = window.setTimeout(() => {
      if (!settled) setView('expired')
    }, 5000)

    return () => {
      settled = true
      subscription.unsubscribe()
      window.clearTimeout(timer)
    }
  }, [linkFailed, linkType, navigate])

  if (view === 'loading') {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl text-ink">Confirming</h1>
        <p className="text-sm text-muted">Checking that link…</p>
      </div>
    )
  }

  if (view === 'expired') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl text-ink">Link expired</h1>
        <p role="alert" aria-live="polite" className="text-sm text-ink">
          This link has expired. Request a new one.
        </p>
        <Link
          to="/forgot-password"
          className={`inline-flex min-h-11 items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
        >
          Request a new link
        </Link>
        <Link to="/signup" className={`text-sm text-muted underline underline-offset-2 ${focusRing}`}>
          Back to sign up
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl text-ink">Email confirmed</h1>
      <p role="status" aria-live="polite" className="text-sm text-ink">
        Your email is confirmed. You can continue.
      </p>
      <Link
        to="/"
        className={`inline-flex min-h-11 items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
      >
        Continue
      </Link>
    </div>
  )
}
