// Same reserved list as public.chosen_username_ok in
// supabase/migrations/20261017120000_signup_username.sql.
export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'administrator',
  'founder',
  'voxly',
  'voxlyteam',
  'support',
  'help',
  'moderator',
  'mod',
  'staff',
  'system',
  'root',
  'null',
  'undefined',
  'api',
  'www',
  'mail',
  'email',
  'security',
  'official',
  'settings',
  'login',
  'logout',
  'signup',
  'register',
  'terms',
  'privacy',
  'discover',
  'create',
  'messages',
  'profile',
  'profiles',
  'notifications',
  'search',
  'home',
  'about',
  'contact',
  'wallet',
  'marketplace',
  'library',
  'reader',
  'writer',
  'penpals',
]

const reserved = new Set(RESERVED_USERNAMES)

export function isReservedUsername(value: string): boolean {
  return reserved.has(value.trim().toLowerCase())
}
