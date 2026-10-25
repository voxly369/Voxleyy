import { describe, expect, it } from 'vitest'
import { COVER_FONT_CATALOG } from './catalog.ts'
import { coverFontLicenceForId, coverFontLicenceNotices } from './fontLicences.ts'

describe('fontLicences', () => {
  it('every catalog font has a licence notice', () => {
    const notices = coverFontLicenceNotices()
    expect(notices).toHaveLength(COVER_FONT_CATALOG.length)
    for (const font of COVER_FONT_CATALOG) {
      expect(coverFontLicenceForId(font.id)?.name).toBeTruthy()
    }
  })
})
