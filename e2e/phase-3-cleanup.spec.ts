import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

test.describe('phase 3 cleanup', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('create sheet shows no Coming soon text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Create' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Coming soon')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Written post/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Book/i })).toBeVisible()
  })

  test('messages communities and channels empty states remain', async ({ page }) => {
    await page.goto('/messages?section=communities', { waitUntil: 'domcontentloaded' })
    const communitiesEmpty = page.getByTestId('messages-communities-empty')
    await expect(communitiesEmpty).toBeVisible()
    await expect(communitiesEmpty).toContainText('Communities are coming')
    await page.goto('/messages?section=channels', { waitUntil: 'domcontentloaded' })
    const channelsEmpty = page.getByTestId('messages-channels-empty')
    await expect(channelsEmpty).toBeVisible()
    await expect(channelsEmpty).toContainText('Channels are coming')
  })

  test('discover shows Explore Communities Slam without Live', async ({ page }) => {
    await page.goto('/discover', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('tab', { name: 'Explore' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Communities' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Slam' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Live' })).toHaveCount(0)
    await expect(page.getByText('Live rooms arrive')).toHaveCount(0)
  })
})
