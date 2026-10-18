import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth/auth-context.ts'

export default function OwnProfileRedirect() {
  const { profile } = useAuth()
  if (!profile?.username) return null
  return <Navigate to={`/u/${profile.username}`} replace />
}
