let e2eMfaEnrolled = false
let e2eMfaAal2 = false
let e2eMfaWrongCode = false
let e2eMfaFactorId = 'e2e-totp-factor-1'

export function resetMfaMocks() {
  e2eMfaEnrolled = false
  e2eMfaAal2 = false
  e2eMfaWrongCode = false
  e2eMfaFactorId = 'e2e-totp-factor-1'
}

export function setE2eMfaEnrolled(enrolled: boolean) {
  e2eMfaEnrolled = enrolled
  if (!enrolled) e2eMfaAal2 = false
}

export function e2eMfaUserFactors(): Array<{
  id: string
  friendly_name: string
  factor_type: string
  status: string
}> {
  if (!e2eMfaEnrolled) return []
  return [
    {
      id: e2eMfaFactorId,
      friendly_name: 'Authenticator app',
      factor_type: 'totp',
      status: 'verified',
    },
  ]
}

export function setE2eMfaWrongCode(wrong: boolean) {
  e2eMfaWrongCode = wrong
}

export function e2eMfaAssuranceLevel(): 'aal1' | 'aal2' {
  return e2eMfaAal2 ? 'aal2' : 'aal1'
}

export function mfaMockHandleAuth(url: string, method: string, postData: unknown): unknown | null {
  if (!url.includes('/auth/v1/factors')) return null

  if (method === 'GET') {
    if (!e2eMfaEnrolled) {
      return { totp: [], phone: [] }
    }
    return {
      totp: [
        {
          id: e2eMfaFactorId,
          friendly_name: 'Authenticator app',
          factor_type: 'totp',
          status: 'verified',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      phone: [],
    }
  }

  if (method === 'POST' && !url.includes('/challenge') && !url.includes('/verify')) {
    return {
      id: e2eMfaFactorId,
      type: 'totp',
      friendly_name: 'Authenticator app',
      totp: {
        qr_code: '',
        secret: 'E2ESECRET123456',
        uri: 'otpauth://totp/Voxly:reader@example.com?secret=E2ESECRET123456&issuer=Voxly',
      },
    }
  }

  const challengeMatch = url.match(/\/factors\/([^/]+)\/challenge/)
  if (method === 'POST' && challengeMatch) {
    return { id: 'e2e-challenge-1', expires_at: Math.floor(Date.now() / 1000) + 300 }
  }

  const verifyMatch = url.match(/\/factors\/([^/]+)\/verify/)
  if (method === 'POST' && verifyMatch) {
    if (e2eMfaWrongCode) {
      return { __httpError: { status: 422, message: 'Invalid code' } }
    }
    e2eMfaEnrolled = true
    e2eMfaAal2 = true
    return { access_token: 'verified', user: { id: 'stub' } }
  }

  if (method === 'DELETE') {
    e2eMfaEnrolled = false
    e2eMfaAal2 = false
    return {}
  }

  return null
}
