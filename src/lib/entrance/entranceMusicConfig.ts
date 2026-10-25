import { entranceMusic } from '../../config/brand.ts'

export type EntranceMusicMeta = {
  src: string
  credit: string
  licence: string
}

declare global {
  interface Window {
    /** Playwright-only override; never set in production. */
    __VOXLY_E2E_ENTRANCE_MUSIC__?: EntranceMusicMeta | null
  }
}

export function resolveEntranceMusic(): EntranceMusicMeta | null {
  if (typeof window !== 'undefined' && window.__VOXLY_E2E_ENTRANCE_MUSIC__ !== undefined) {
    return window.__VOXLY_E2E_ENTRANCE_MUSIC__
  }
  return entranceMusic
}
