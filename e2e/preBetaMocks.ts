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

export function setE2eConsentsOutdated() {
  consentRecords = [{ document: 'terms', version: 'old-version', accepted_at: '2025-01-01T00:00:00.000Z' }]
}

export function resetPreBetaMocks() {
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
    return false
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
    return { user: { email: 'reader@example.com' }, exports: [] }
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
