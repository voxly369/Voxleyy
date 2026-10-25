export type E2eBetaSignupConfig = {
  signups_open: boolean
  invite_only: boolean
  waitlist_open: boolean
  closed_message: string | null
}

let betaSignupConfig: E2eBetaSignupConfig = {
  signups_open: true,
  invite_only: false,
  waitlist_open: false,
  closed_message: null,
}

const CURRENT_CONSENT_VERSION = 'draft-2026-01'

let betaAccessGranted = true
let inviteOnlyPlatform = false
let consentRecords: Array<{ document: string; version: string; accepted_at: string }> = [
  { document: 'terms', version: CURRENT_CONSENT_VERSION, accepted_at: '2026-01-01T00:00:00.000Z' },
  { document: 'privacy', version: CURRENT_CONSENT_VERSION, accepted_at: '2026-01-01T00:00:00.000Z' },
]

const inviteCodeValid: Record<string, boolean> = {}

export function setE2eInviteCodeValid(code: string, valid: boolean) {
  inviteCodeValid[code.trim().toUpperCase()] = valid
}

export function resetE2eInviteCodeValidity() {
  for (const key of Object.keys(inviteCodeValid)) delete inviteCodeValid[key]
}

let inviteCodes: Array<Record<string, unknown>> = [
  {
    code: 'ABCDEFGHJK',
    max_uses: 5,
    uses: 1,
    expires_at: null,
    revoked: false,
    created_at: '2026-01-01T00:00:00.000Z',
    note: 'e2e',
  },
]

let exportMyDataCallCount = 0
let exportTruncated = false

let clientErrorGroups: Array<Record<string, unknown>> = [
  {
    message: 'TypeError: Cannot read properties of undefined',
    count: 3,
    last_seen: '2026-01-02T00:00:00.000Z',
    dismissed: false,
  },
]

export function setE2eBetaSignupConfig(config: Partial<E2eBetaSignupConfig>) {
  betaSignupConfig = { ...betaSignupConfig, ...config }
}

export function setE2eBetaAccessGranted(granted: boolean) {
  betaAccessGranted = granted
}

export function setE2eInviteOnlyPlatform(enabled: boolean) {
  inviteOnlyPlatform = enabled
}

export function setE2eConsentsCurrent() {
  consentRecords = [
    { document: 'terms', version: CURRENT_CONSENT_VERSION, accepted_at: '2026-01-01T00:00:00.000Z' },
    { document: 'privacy', version: CURRENT_CONSENT_VERSION, accepted_at: '2026-01-01T00:00:00.000Z' },
  ]
}

export function setE2eExportTruncated(truncated: boolean) {
  exportTruncated = truncated
}

export function setE2eConsentsOutdated() {
  consentRecords = [
    { document: 'terms', version: 'old-version', accepted_at: '2025-01-01T00:00:00.000Z' },
    { document: 'privacy', version: 'old-version', accepted_at: '2025-01-01T00:00:00.000Z' },
  ]
}

export function setE2eConsentRecords(
  records: Array<{ document: string; version: string; accepted_at: string }>,
) {
  consentRecords = records
}

export function resetPreBetaMocks() {
  resetE2eInviteCodeValidity()
  betaSignupConfig = {
    signups_open: true,
    invite_only: false,
    waitlist_open: false,
    closed_message: null,
  }
  betaAccessGranted = true
  inviteOnlyPlatform = false
  consentRecords = [
    { document: 'terms', version: CURRENT_CONSENT_VERSION, accepted_at: '2026-01-01T00:00:00.000Z' },
    { document: 'privacy', version: CURRENT_CONSENT_VERSION, accepted_at: '2026-01-01T00:00:00.000Z' },
  ]
  exportMyDataCallCount = 0
  exportTruncated = false
  inviteCodes = [
    {
      code: 'ABCDEFGHJK',
      max_uses: 5,
      uses: 1,
      expires_at: null,
      revoked: false,
      created_at: '2026-01-01T00:00:00.000Z',
      note: 'e2e',
    },
  ]
  clientErrorGroups = [
    {
      message: 'TypeError: Cannot read properties of undefined',
      count: 3,
      last_seen: '2026-01-02T00:00:00.000Z',
      dismissed: false,
    },
  ]
}

export function preBetaMockHandleRest(url: string, _method: string, postData: unknown): unknown | undefined {
  if (url.includes('/rest/v1/rpc/get_beta_signup_config')) {
    return betaSignupConfig
  }
  if (url.includes('/rest/v1/rpc/username_available')) {
    return true
  }
  if (url.includes('/rest/v1/rpc/join_beta_waitlist')) {
    return null
  }
  if (url.includes('/rest/v1/rpc/check_invite_code')) {
    const code = String((postData as { p_code?: string } | null)?.p_code ?? '').trim().toUpperCase()
    if (code in inviteCodeValid) return inviteCodeValid[code]
    if (code === 'USEDCODE11') return false
    if (code === 'EXPIRED111') return false
    return code === 'ABCDEFGHJK'
  }
  if (url.includes('/rest/v1/rpc/redeem_invite_code')) {
    const code = (postData as { p_code?: string } | null)?.p_code
    if (code === 'BADCODE') {
      return { __httpError: { status: 400, message: 'invalid invite' } }
    }
    return null
  }
  if (url.includes('/rest/v1/rpc/record_user_consent')) {
    return null
  }
  if (url.includes('/rest/v1/rpc/export_my_data')) {
    exportMyDataCallCount += 1
    if (exportMyDataCallCount > 1) {
      return {
        __httpError: { status: 400, message: 'You can download your data once per day.' },
      }
    }
    if (exportTruncated) {
      return {
        exported_at: '2026-01-01T00:00:00.000Z',
        truncated: true,
        max_bytes: 4000000,
        notice: 'Your export is too large to return in one file. Contact support for a full archive.',
      }
    }
    return {
      exported_at: '2026-01-01T00:00:00.000Z',
      truncated: false,
      profile: { id: '11111111-1111-1111-1111-111111111111', username: 'readerone' },
      notification_settings: {},
      creations: [],
      comments: [],
      likes: [],
      saves: [],
      follows: [],
      collections: [],
      highlights: [],
      bookmarks: [],
      reading_progress: [],
      badges: [],
      messages_sent: [],
      consents: [],
    }
  }
  if (url.includes('/rest/v1/rpc/delete_my_account')) {
    return null
  }
  if (url.includes('/rest/v1/rpc/founder_set_platform_flag')) {
    return null
  }
  if (url.includes('/rest/v1/rpc/founder_create_invite_code')) {
    inviteCodes.unshift({
      code: 'ZYXWVUTSRQ',
      max_uses: 1,
      uses: 0,
      expires_at: null,
      revoked: false,
      created_at: '2026-02-01T00:00:00.000Z',
      note: 'created in e2e',
    })
    return 'ZYXWVUTSRQ'
  }
  if (url.includes('/rest/v1/rpc/founder_list_invite_codes')) {
    return inviteCodes
  }
  if (url.includes('/rest/v1/rpc/founder_revoke_invite_code')) {
    const code = (postData as { p_code?: string } | null)?.p_code
    inviteCodes = inviteCodes.map((row) =>
      row.code === code ? { ...row, revoked: true } : row,
    )
    return null
  }
  if (url.includes('/rest/v1/rpc/founder_client_errors_grouped')) {
    return clientErrorGroups
  }
  if (url.includes('/rest/v1/rpc/founder_dismiss_client_error')) {
    const msg = (postData as { p_message?: string } | null)?.p_message
    clientErrorGroups = clientErrorGroups.map((row) =>
      row.message === msg ? { ...row, dismissed: true } : row,
    )
    return null
  }
  if (url.includes('/rest/v1/rpc/get_my_beta_status')) {
    return {
      invite_only: inviteOnlyPlatform,
      access_granted: betaAccessGranted,
    }
  }
  if (url.includes('/rest/v1/rpc/get_my_consents')) {
    return consentRecords
  }
  if (url.includes('/rest/v1/rpc/report_client_error')) {
    return null
  }
  return undefined
}
