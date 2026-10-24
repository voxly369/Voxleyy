import { Navigate, useSearchParams } from 'react-router-dom'
import { normalizeInviteCode } from '../../lib/beta/inviteCode.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function JoinPage() {
  useDocumentTitle('Join Voxly')
  const [params] = useSearchParams()
  const raw = params.get('code') ?? ''
  let code = raw
  try {
    code = normalizeInviteCode(raw)
  } catch {
    code = raw.trim()
  }
  const query = code ? `?code=${encodeURIComponent(code)}&from=join` : '?from=join'
  return <Navigate to={`/signup${query}`} replace />
}
