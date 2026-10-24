/** Documented browser persistence used by the Voxly web app (for Privacy draft accuracy). */
export const CLIENT_STORAGE_INVENTORY = [
  { store: 'localStorage', key: 'voxly-theme', purpose: 'Light/dark theme preference' },
  { store: 'localStorage', key: 'voxly-welcome-moment-v1', purpose: 'Welcome moment dismissed per device' },
  { store: 'localStorage', key: 'voxly-offline-reading-v1', purpose: 'Offline reading queue metadata' },
  { store: 'sessionStorage', key: 'voxly-activity-touch-v1', purpose: 'Once-per-session activity ping guard' },
  { store: 'IndexedDB', key: 'voxly-offline-reading', purpose: 'Cached chapters/posts for offline reading' },
  { store: 'cookie', key: 'sb-* (Supabase Auth)', purpose: 'Authentication session (essential)' },
] as const
