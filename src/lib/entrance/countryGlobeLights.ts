import { COUNTRIES } from '../profiles/countries.ts'

export type GlobeLight = { code: string; lat: number; lng: number; decorative?: boolean }

const DECORATIVE_LIGHTS: GlobeLight[] = [
  { code: '—', lat: 12, lng: -40, decorative: true },
  { code: '—', lat: -22, lng: 55, decorative: true },
  { code: '—', lat: 38, lng: 95, decorative: true },
  { code: '—', lat: -8, lng: -145, decorative: true },
  { code: '—', lat: 51, lng: 10, decorative: true },
]

function hashCountry(code: string): number {
  let h = 0
  for (let i = 0; i < code.length; i += 1) h = (h * 31 + code.charCodeAt(i)) >>> 0
  return h
}

/** Approximate globe coordinates from ISO codes in signup country data. */
export function globeLightsForCountryCodes(codes: readonly string[]): GlobeLight[] {
  const known = new Set(COUNTRIES.map((c) => c.code))
  const lights: GlobeLight[] = []
  for (const raw of codes) {
    const code = raw.trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(code) || !known.has(code)) continue
    const h = hashCountry(code)
    const lat = ((h % 130) - 65) * 0.85
    const lng = ((Math.floor(h / 130) % 360) - 180) * 0.95
    lights.push({ code, lat, lng })
  }
  if (lights.length === 0) return DECORATIVE_LIGHTS
  return lights.slice(0, 12)
}

export function projectGlobePoint(
  lat: number,
  lng: number,
  cx: number,
  cy: number,
  radius: number,
  spinRad: number,
): { x: number; y: number; visible: boolean } {
  const lam = ((lng + (spinRad * 180) / Math.PI) * Math.PI) / 180
  const phi = (lat * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const x = cx + radius * cosPhi * Math.sin(lam)
  const y = cy - radius * Math.sin(phi)
  const visible = cosPhi * Math.cos(lam) > -0.08
  return { x, y, visible }
}
