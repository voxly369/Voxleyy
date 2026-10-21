import { useAuth } from '../../lib/auth/auth-context.ts'
import { FollowButton } from './FollowButton.tsx'

type FollowOrYouLabelProps = {
  userId: string
  username: string
  following: boolean
  onFollowingChange: (next: boolean) => void
}

export function FollowOrYouLabel({ userId, username, following, onFollowingChange }: FollowOrYouLabelProps) {
  const { profile } = useAuth()
  if (profile?.id === userId) {
    return <span className="text-sm font-medium text-muted">You</span>
  }
  return (
    <FollowButton userId={userId} username={username} following={following} onChange={onFollowingChange} />
  )
}
