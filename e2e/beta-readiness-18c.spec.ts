import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setE2eOwnProfileVerified, READER } from './fixtures.ts'

test.describe('18C verified seal and messages tabs', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('opens About this profile from verified seal on profile header', async ({ page }) => {
    setE2eOwnProfileVerified(true)
    await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('profile-verified-seal-button')).toBeVisible()
    await page.getByTestId('profile-verified-seal-button').click()
    await expect(page.getByTestId('about-profile-sheet')).toBeVisible()
  })

  test('messages section tabs show communities empty state', async ({ page }) => {
    await page.goto('/messages?section=communities', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('messages-communities-empty')).toBeVisible()
    await expect(page.getByText(/Communities are coming to Voxly/i)).toBeVisible()
  })

  test('notification bell sits on the right on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/home', { waitUntil: 'domcontentloaded' })
    const bell = page.getByTestId('notification-bell-mobile')
    await expect(bell).toBeVisible()
    const box = await bell.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.x).toBeGreaterThan(200)
  })
})
