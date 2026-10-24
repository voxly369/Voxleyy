import { describe, expect, it } from 'vitest'
import { totpUriToQrDataUrl } from './qrCode.ts'

describe('totpUriToQrDataUrl', () => {
  it('returns a PNG data URL for a provisioning URI', async () => {
    const url = await totpUriToQrDataUrl(
      'otpauth://totp/Voxly:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Voxly',
    )
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
  })
})
