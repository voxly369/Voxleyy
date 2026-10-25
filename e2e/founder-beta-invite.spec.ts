import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'

test.describe('Founder beta invite codes', () => {
  test('creates a multi-use code and lists it with uses left', async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setModerationIsFounder(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Beta' }).click()
    await expect(page.getByTestId('founder-beta-tab')).toBeVisible()
    await page.getByTestId('founder-beta-invite-max-uses').fill('3')
    await page.getByTestId('founder-beta-invite-expires').fill('2026-12-31')
    await page.getByTestId('founder-beta-invite-note').fill('E2E cohort')
    await page.getByTestId('founder-beta-create-invite').click()
    await expect(page.getByTestId('founder-beta-invite-code')).toContainText('ZYXWVUTSRQ')
    const row = page.getByTestId('founder-beta-invite-row').first()
    await expect(row).toContainText('ZYXWVUTSRQ')
    await expect(row.getByTestId('founder-beta-invite-uses-left')).toContainText('3 left')
    await row.getByTestId('founder-beta-revoke-invite').click()
    await expect(row).toContainText('revoked')
  })
})
