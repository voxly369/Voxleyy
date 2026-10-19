// Reads go through profiles_public so city respects city_visible at the database layer.
export const PROFILES_PUBLIC_COLUMNS =
  'id, username, display_name, bio, avatar_url, banner_url, website, country, city, city_visible, timezone, language, role, status, suspended_until, verified, who_can_message, follower_count, following_count, creation_count, created_at, updated_at' as const

export const PROFILES_PUBLIC_SUMMARY_COLUMNS =
  'id, username, display_name, bio, avatar_url, banner_url, website, country, city, city_visible, language, role, verified, follower_count, following_count, creation_count, created_at' as const
