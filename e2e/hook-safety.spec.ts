import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'

test.describe('e2e hook safety', () => {
  test('localStorage founder spoof does not grant /founder without RPC', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('voxly-founder', '1')
      localStorage.setItem('voxly-is-founder', 'true')
      ;(window as unknown as { __VOXLY_E2E__?: boolean }).__VOXLY_E2E__ = true
    })
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('settings-founder-section')).toHaveCount(0)
  })

  test('setModerationIsFounder only affects mocked Supabase in e2e', async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setModerationIsFounder(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('founder-analytics-overview')).toBeVisible()
  })
})
