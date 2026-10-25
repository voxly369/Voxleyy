/** Documented browser persistence used by the Voxly web app (for Privacy draft accuracy). */
export const CLIENT_STORAGE_INVENTORY = [
  { store: 'localStorage', key: 'voxly-theme', purpose: 'Light/dark theme preference' },
  { store: 'localStorage', key: 'voxly-last-visit-v1', purpose: 'Last visit day for long-absence welcome on this device' },
  {
    store: 'localStorage',
    key: 'voxly-last-entrance-dismissed-at-v1',
    purpose: 'When the entrance was last dismissed for the 30-minute fresh-open rule',
  },
  { store: 'localStorage', key: 'voxly-welcome-moment-v1', purpose: 'Welcome moment dismissed per device' },
  { store: 'localStorage', key: 'voxly:confirm-resend', purpose: 'Sign-up confirmation resend rate limit timestamps' },
  { store: 'localStorage', key: 'voxly-username-notice', purpose: 'Dismissed username-assignment notice per account' },
  { store: 'localStorage', key: 'voxly-display-name-prompt', purpose: 'Dismissed display-name prompt per account' },
  { store: 'localStorage', key: 'voxly-reader-preferences', purpose: 'Reader font and display preferences' },
  { store: 'localStorage', key: 'voxly-offline-reading-v1', purpose: 'Offline reading package metadata' },
  { store: 'localStorage', key: 'voxly-highlight-offline-*', purpose: 'Queued highlight edits per chapter while offline' },
  { store: 'sessionStorage', key: 'voxly-activity-touch-v1', purpose: 'Once-per-session activity ping guard' },
  { store: 'IndexedDB', key: 'voxly-offline-reading', purpose: 'Cached chapters and posts for offline reading' },
  { store: 'cookie', key: 'sb-* (Supabase Auth)', purpose: 'Authentication session (essential)' },
] as const
