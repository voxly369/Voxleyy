import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth/auth-context.ts'

/** Legacy route — own-profile Drafts tab (spec §6). */
export default function DraftsListPage() {
  const { profile } = useAuth()
  if (!profile?.username) return null
  return <Navigate to={`/u/${profile.username}?tab=drafts`} replace />
}
