import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'

async function openBetaInviteTab(page: import('@playwright/test').Page) {
  await installSupabaseMocks(page)
  await seedSignedInSession(page)
  setModerationIsFounder(true)
  await page.goto('/founder', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Beta' }).click()
  await expect(page.getByTestId('founder-beta-tab')).toBeVisible()
}

async function createInviteFromForm(page: import('@playwright/test').Page) {
  await page.getByTestId('founder-beta-invite-max-uses').fill('3')
  await page.getByTestId('founder-beta-invite-expires').fill('2026-12-31')
  await page.getByTestId('founder-beta-invite-note').fill('E2E cohort')
  await page.getByTestId('founder-beta-create-invite').click()
  await expect(page.getByTestId('founder-beta-invite-code')).toContainText('ZYXWVUTSRQ')
}

test.describe('Founder beta invite codes', () => {
  test('creates a multi-use code and lists it with uses left', async ({ page }) => {
    await openBetaInviteTab(page)
    await createInviteFromForm(page)
    const row = page.getByTestId('founder-beta-invite-row').first()
    await expect(row).toContainText('ZYXWVUTSRQ')
    await expect(row.getByTestId('founder-beta-invite-uses-left')).toContainText('3 left')
  })

  test('founder beta invite copies code from Beta tab', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openBetaInviteTab(page)
    await createInviteFromForm(page)
    await page.getByTestId('founder-beta-copy-code').click()
    await expect(page.getByText('Code copied.')).toBeVisible()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toBe('ZYXWVUTSRQ')
  })

  test('founder beta invite copies join link from Beta tab', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openBetaInviteTab(page)
    await createInviteFromForm(page)
    await page.getByTestId('founder-beta-copy-join-link').click()
    await expect(page.getByText('Join link copied.')).toBeVisible()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('ZYXWVUTSRQ')
    expect(clip).toMatch(/\/join\?code=/)
  })

  test('founder beta invite revoke marks code revoked in list', async ({ page }) => {
    await openBetaInviteTab(page)
    await createInviteFromForm(page)
    const row = page.getByTestId('founder-beta-invite-row').first()
    await row.getByTestId('founder-beta-revoke-invite').click()
    await expect(row).toContainText('revoked')
  })
})
