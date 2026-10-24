import QRCode from 'qrcode'

/** Renders a TOTP provisioning URI as a PNG data URL entirely in the browser. */
export async function totpUriToQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 220,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })
}
