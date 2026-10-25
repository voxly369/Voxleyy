const READER_ID = '11111111-1111-1111-1111-111111111111'

let onboardingCompleted = false
let onboardingStep = 0
let feedbackCount = 0
let founderWelcomeSent = false
let feedbackSubmitCount = 0
let feedbackMarkedDone = false
let lastEntranceLocalDate: string | null = null
let showEntranceScreen = true
let welcomeMomentSeenAt: string | null = '2026-01-01T00:00:00.000Z'
let quoteOfDayBroken = false

export function setE2eOnboardingIncomplete(step = 0) {
  onboardingCompleted = false
  onboardingStep = step
}

export function setE2eOnboardingComplete() {
  onboardingCompleted = true
  onboardingStep = 99
}

export function resetBetaReadiness18bMocks() {
  onboardingCompleted = true
  onboardingStep = 99
  feedbackCount = 0
  founderWelcomeSent = false
  feedbackSubmitCount = 0
  feedbackMarkedDone = false
  lastEntranceLocalDate = '2099-01-01'
  showEntranceScreen = false
  welcomeMomentSeenAt = '2026-01-01T00:00:00.000Z'
  quoteOfDayBroken = false
}

export function setE2eQuoteOfDayBroken(broken: boolean) {
  quoteOfDayBroken = broken
}

export function setE2eEntranceVisible(visible: boolean) {
  if (visible) {
    lastEntranceLocalDate = null
    showEntranceScreen = true
    try {
      localStorage.removeItem('voxly-last-visit-v1')
    } catch {
      /* ignore */
    }
  } else {
    lastEntranceLocalDate = '2099-01-01'
    showEntranceScreen = false
  }
}

export function setE2eOnboardingForEntranceE2e() {
  onboardingCompleted = false
  onboardingStep = 0
  welcomeMomentSeenAt = '2026-01-01T00:00:00.000Z'
}

export function betaReadiness18bMockHandleRest(url: string, method: string, postData: unknown): unknown | undefined {
  if (url.includes('/rest/v1/rpc/get_my_profile_preferences')) {
    return {
      user_id: READER_ID,
      onboarding_completed_at: onboardingCompleted ? '2026-01-02T00:00:00.000Z' : null,
      onboarding_step: onboardingStep,
      writer_roles: ['poet'],
      favorite_genres: ['poetry'],
      languages: ['en', 'af'],
      welcome_moment_seen_at: welcomeMomentSeenAt,
      last_entrance_local_date: lastEntranceLocalDate,
      show_entrance_screen: showEntranceScreen,
      checklist_dismissed_at: null,
      checklist_progress: {},
    }
  }
  if (url.includes('/rest/v1/rpc/upsert_my_profile_preferences')) {
    const patch = (postData as { p_patch?: Record<string, unknown> } | null)?.p_patch ?? {}
    if (typeof patch.onboarding_step === 'number') onboardingStep = patch.onboarding_step
    if (patch.onboarding_completed_at === null) onboardingCompleted = false
    if (typeof patch.last_entrance_local_date === 'string') lastEntranceLocalDate = patch.last_entrance_local_date
    if (typeof patch.show_entrance_screen === 'boolean') showEntranceScreen = patch.show_entrance_screen
    return {
      user_id: READER_ID,
      onboarding_completed_at: onboardingCompleted ? '2026-01-02T00:00:00.000Z' : null,
      onboarding_step: onboardingStep,
      writer_roles: [],
      favorite_genres: [],
      languages: ['en'],
      welcome_moment_seen_at: welcomeMomentSeenAt,
      last_entrance_local_date: lastEntranceLocalDate,
      show_entrance_screen: showEntranceScreen,
      checklist_dismissed_at: null,
      checklist_progress: {},
    }
  }
  if (url.includes('/rest/v1/rpc/quote_of_the_day')) {
    if (quoteOfDayBroken) {
      return { __httpError: { status: 500, message: 'quote unavailable' } }
    }
    return { text: 'Quiet ink can still change a room.', author: 'Voxly', source: null, kind: 'original' }
  }
  if (url.includes('/rest/v1/rpc/writing_prompt_for_date')) return 'Threshold'
  if (url.includes('/rest/v1/rpc/founder_list_daily_quotes')) {
    return {
      rows: [
        {
          id: '00000000-0000-0000-0000-000000000099',
          text: 'Seed quote',
          author: 'Voxly',
          source: null,
          active: true,
          kind: 'original',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      next_cursor: null,
    }
  }
  if (url.includes('/rest/v1/rpc/founder_active_daily_quote_count')) return 120
  if (url.includes('/rest/v1/rpc/founder_upsert_daily_quote')) return '00000000-0000-0000-0000-000000000099'
  if (url.includes('/rest/v1/rpc/complete_my_onboarding')) {
    onboardingCompleted = true
    onboardingStep = 99
    if (!founderWelcomeSent) founderWelcomeSent = true
    return {
      user_id: READER_ID,
      onboarding_completed_at: '2026-01-02T00:00:00.000Z',
      onboarding_step: 99,
      writer_roles: [],
      favorite_genres: [],
      languages: ['en'],
      welcome_moment_seen_at: '2026-01-01T00:00:00.000Z',
      checklist_dismissed_at: null,
      checklist_progress: {},
    }
  }
  if (url.includes('/rest/v1/rpc/submit_app_feedback')) {
    feedbackSubmitCount += 1
    if (feedbackSubmitCount > 10) {
      return { __httpError: { status: 400, message: 'You can send up to 10 pieces of feedback per day.' } }
    }
    feedbackCount += 1
    return feedbackCount
  }
  if (url.includes('/rest/v1/rpc/founder_list_feedback')) {
    return {
      rows: [
        {
          id: 1,
          user_id: READER_ID,
          category: 'idea',
          message: 'Love the reading experience.',
          page_path: '/settings',
          app_version: '0.0.0',
          viewport: '375x667',
          read_at: feedbackMarkedDone ? '2026-01-02T12:00:00.000Z' : null,
          done_at: feedbackMarkedDone ? '2026-01-02T12:00:00.000Z' : null,
          founder_note: null,
          created_at: '2026-01-02T12:00:00.000Z',
        },
      ],
      next_cursor: null,
    }
  }
  if (url.includes('/rest/v1/rpc/founder_feedback_unread_count')) return 1
  if (url.includes('/rest/v1/rpc/founder_update_feedback')) {
    feedbackMarkedDone = true
    return null
  }
  if (url.includes('/rest/v1/rpc/get_country_page')) {
    const body = postData as { p_code?: string } | null
    const code = (body?.p_code ?? 'ZA').toUpperCase()
    if (code === 'AQ') {
      return {
        code: 'AQ',
        name: 'Antarctica',
        primary_timezone: null,
        main_languages: [],
        writer_count: 0,
        post_count: 0,
      }
    }
    return {
      code: 'ZA',
      name: 'South Africa',
      primary_timezone: 'Africa/Johannesburg',
      main_languages: ['en', 'af', 'zu'],
      writer_count: 2,
      post_count: 5,
    }
  }
  if (url.includes('/rest/v1/rpc/list_country_trending')) {
    return { rows: [], next_cursor: null }
  }
  if (url.includes('/rest/v1/rpc/list_country_rising_writers')) {
    return { rows: [] }
  }
  if (url.includes('/rest/v1/rpc/list_countries_browse')) {
    return {
      rows: [
        { code: 'ZA', name: 'South Africa', primary_timezone: 'Africa/Johannesburg' },
        { code: 'US', name: 'United States', primary_timezone: 'America/New_York' },
      ],
      next_cursor: null,
    }
  }
  if (url.includes('/rest/v1/rpc/check_upload_quota')) return null
  if (url.includes('/rest/v1/rpc/queue_storage_object_for_deletion')) return null
  if (url.includes('/rest/v1/rpc/founder_pending_storage_cleanup_count')) return 2
  if (url.includes('/rest/v1/rpc/founder_list_deletion_storage_queue')) {
    return [{ bucket_id: 'avatars', object_path: `${READER_ID}/x.webp`, queued_at: '2026-01-01T00:00:00.000Z' }]
  }
  if (url.includes('/rest/v1/app_feedback') && method === 'GET') {
    return [{ id: 1 }]
  }
  if (url.includes('/rest/v1/creations') && url.includes('status=eq.published') && url.includes('select=id')) {
    return [{ id: '00000000-0000-0000-0000-000000000001' }]
  }
  if (url.includes('/rest/v1/follows') && url.includes('select=followee_id') && !url.includes('profile')) {
    return [{ followee_id: '22222222-2222-2222-2222-222222222222' }, { followee_id: '33333333-3333-3333-3333-333333333333' }]
  }
  if (url.includes('/rest/v1/library_saved_items')) {
    return [{ creation_id: '00000000-0000-0000-0000-000000000001' }]
  }
  if (url.includes('/rest/v1/library_continue_reading')) {
    return [{ creation_id: '00000000-0000-0000-0000-000000000001', updated_at: '2026-01-01T00:00:00.000Z' }]
  }
  if (url.includes('/rest/v1/library_continue_reading')) return []
  if (url.includes('/rest/v1/creations') && url.includes('head=true')) {
    return null
  }
  return undefined
}

export function e2eFounderWelcomeWasSent() {
  return founderWelcomeSent
}
