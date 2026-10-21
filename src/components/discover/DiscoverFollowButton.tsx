import { useEffect, useState } from 'react'
import { FollowOrYouLabel } from '../profile/FollowOrYouLabel.tsx'
import { isFollowing } from '../../lib/profiles/api.ts'

type DiscoverFollowButtonProps = {
  userId: string
  username: string
}

export function DiscoverFollowButton({ userId, username }: DiscoverFollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    void isFollowing(userId).then((result) => {
      if (!active) return
      if (result.ok) setFollowing(result.data)
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [userId])

  if (!ready) return null

  return (
    <FollowOrYouLabel
      userId={userId}
      username={username}
      following={following}
      onFollowingChange={setFollowing}
    />
  )
}
