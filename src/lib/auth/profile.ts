import type { Database } from '../database.types.ts'
import { supabase } from '../supabaseClient.ts'

export type AccountStatus = Database['public']['Enums']['account_status']
export type UserRole = Database['public']['Enums']['user_role']

// Authenticated users may read every profiles column except status_reason.
// The account screen must not show that private moderation note.
export const OWN_PROFILE_COLUMNS =
  'id, username, display_name, bio, avatar_url, banner_url, website, country, city, city_visible, timezone, language, role, status, suspended_until, verified, who_can_message, follower_count, following_count, creation_count, created_at, updated_at' as const

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
    .from('profiles')
    .select(OWN_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function fetchIsFounder(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_founder')
  if (error) return false
  return data === true
}
