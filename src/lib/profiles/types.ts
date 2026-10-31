import type { UserRole } from '../auth/profile.ts'

export type ProfileErrorCode = 'not_found' | 'unavailable' | 'invalid' | 'self_follow' | 'forbidden'

export type ProfileFailure = {
  ok: false
  error: {
    code: ProfileErrorCode
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type ProfileResult<T> = { ok: true; data: T } | ProfileFailure

export type PublicProfile = {
  id: string
  username: string
  displayName: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
  website: string | null
  country: string | null
  city: string | null
  cityVisible: boolean
  language: string
  role: UserRole
  verified: boolean
  verifiedAt: string | null
  followerCount: number
  followingCount: number
  creationCount: number
  createdAt: string
  showLocalTime: boolean
  timezone: string
}

export type ProfileUpdate = {
  display_name?: string
  bio?: string
  avatar_url?: string | null
  banner_url?: string | null
  website?: string | null
  country?: string | null
  city?: string | null
  city_visible?: boolean
  language?: string
  who_can_message?: 'everyone' | 'followers' | 'subscribers'
}

export type FollowListProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
  country: string | null
  role: UserRole
}

export type FollowListEntry = {
  createdAt: string
  id: string
  profile: FollowListProfile
  following: boolean
  isSelf: boolean
}

export type FollowPage = {
  entries: FollowListEntry[]
  nextCursor: { createdAt: string; id: string } | null
}
