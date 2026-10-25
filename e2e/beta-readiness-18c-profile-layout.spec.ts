import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eOwnProfileDisplayName,
  setE2eOwnProfileVerified,
  READER,
} from './fixtures.ts'

const EIGHTEEN_CHAR_NAME = 'ABCDEFGHIJKLMNOPQR'
const PROFILE_SEAL_WIDTHS = [375, 767, 1024, 1440] as const

test.describe('18C profile header seal and name layout', () => {
  test.beforeEach(async ({ page }) => {
    setE2eOwnProfileVerified(true)
    setE2eOwnProfileDisplayName(EIGHTEEN_CHAR_NAME)
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('profile header shows full 18-character display name at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
    const name = page.getByRole('heading', { level: 1, name: EIGHTEEN_CHAR_NAME })
    await expect(name).toBeVisible()
    const truncated = await name.evaluate((el) => {
      const text = el.querySelector('span')
      if (!text) return true
      return text.scrollWidth > text.clientWidth + 1
    })
    expect(truncated).toBe(false)
  })

  test('profile header About this profile link sits under handle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
    const handle = page.getByText(`@${READER.username}`)
    const about = page.getByTestId('profile-about-link')
    await expect(about).toBeVisible()
    const handleBox = await handle.boundingBox()
    const aboutBox = await about.boundingBox()
    expect(handleBox).not.toBeNull()
    expect(aboutBox).not.toBeNull()
    if (handleBox && aboutBox) {
      expect(aboutBox.y).toBeGreaterThan(handleBox.y)
    }
  })

  test('profile header verified seal visible at 375 767 1024 1440', async ({ page }) => {
    for (const width of PROFILE_SEAL_WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
      const seal = page.getByTestId('profile-verified-seal-button').getByTestId('verified-seal')
      await expect(seal).toBeVisible()
      await expect(seal).toHaveAttribute('data-seal-size', 'md')
      const box = await seal.boundingBox()
      expect(box).not.toBeNull()
      if (box) expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
    }
  })

  test('axe on profile header at 375 and 1280', async ({ page }) => {
    for (const width of [375, 1280] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
      const results = await new AxeBuilder({ page }).include('header').analyze()
      expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
    }
  })
})
