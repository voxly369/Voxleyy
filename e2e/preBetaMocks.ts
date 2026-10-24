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

export function setE2eBetaSignupConfig(config: Partial<E2eBetaSignupConfig>) {
  betaSignupConfig = { ...betaSignupConfig, ...config }
}

export function resetPreBetaMocks() {
  betaSignupConfig = {
    signups_open: true,
    invite_only: false,
    waitlist_open: false,
    closed_message: null,
  }
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
    return 'E2E-INVITE-CODE'
  }
  if (url.includes('/rest/v1/rpc/report_client_error')) {
    return null
  }
  return undefined
}
