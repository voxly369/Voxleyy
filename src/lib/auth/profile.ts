import type { Database } from '../database.types.ts'
import { PROFILES_PUBLIC_COLUMNS } from '../profiles/profileColumns.ts'
import { supabase } from '../supabaseClient.ts'

export type AccountStatus = Database['public']['Enums']['account_status']
export type UserRole = Database['public']['Enums']['user_role']

// Authenticated users may read every profiles column except status_reason.
// The account screen must not show that private moderation note.
export const OWN_PROFILE_COLUMNS = PROFILES_PUBLIC_COLUMNS

export type OwnProfile = {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string | null
  banner_url: string | null
  website: string | null
  country: string | null
  city: string | null
  city_visible: boolean
  timezone: string
  language: string
  role: UserRole
  status: AccountStatus
  suspended_until: string | null
  verified: boolean
  who_can_message: string
  follower_count: number
  following_count: number
  creation_count: number
  created_at: string
  updated_at: string
}

export function isRestrictedStatus(status: AccountStatus): boolean {
  return status === 'suspended' || status === 'banned'
}

export async function fetchOwnProfile(userId: string): Promise<OwnProfile | null> {
  const { data, error } = await supabase
    .from('profiles_public')
    .select(OWN_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.id || !data.username || !data.created_at || !data.updated_at) return null
  return {
    id: data.id,
    username: data.username,
    display_name: data.display_name ?? '',
    bio: data.bio ?? '',
    avatar_url: data.avatar_url,
    banner_url: data.banner_url,
    website: data.website,
    country: data.country,
    city: data.city,
    city_visible: data.city_visible ?? false,
    timezone: data.timezone ?? 'UTC',
    language: data.language ?? 'en',
    role: data.role ?? 'reader',
    status: data.status ?? 'active',
    suspended_until: data.suspended_until,
    verified: data.verified ?? false,
    who_can_message: data.who_can_message ?? 'everyone',
    follower_count: data.follower_count ?? 0,
    following_count: data.following_count ?? 0,
    creation_count: data.creation_count ?? 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export async function fetchIsFounder(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_founder')
  if (error) return false
  return data === true
}
