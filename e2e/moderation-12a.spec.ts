import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  OTHER,
  READER,
  setModerationReportDuplicate,
} from './fixtures.ts'

test.describe('moderation 12A flows', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.route('**/rest/v1/reports**', async (route) => {
      if (route.request().method() === 'POST') {
        if (reportDuplicateFlag) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'You already reported this', code: 'P0001' }),
          })
          return
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: '00000000-0000-0000-0000-000000000088' }]),
        })
        return
      }
      await route.fallback()
    })
  })

  let reportDuplicateFlag = false
  test.beforeEach(() => {
    reportDuplicateFlag = false
  })

  test('report sheet submits from post card menu', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('safety-overflow-menu-trigger').first().click()
    await page.getByRole('menuitem', { name: 'Report' }).click()
    await expect(page.getByTestId('report-sheet-form')).toBeVisible()
    await page.getByRole('button', { name: 'Submit report' }).click()
    await expect(page.getByTestId('report-sheet-success')).toBeVisible({ timeout: 5000 })
  })

  test('report sheet shows duplicate state', async ({ page }) => {
    reportDuplicateFlag = true
    setModerationReportDuplicate(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('safety-overflow-menu-trigger').first().click()
    await page.getByRole('menuitem', { name: 'Report' }).click()
    await page.getByRole('button', { name: 'Submit report' }).click()
    await expect(page.getByTestId('report-sheet-duplicate')).toBeVisible()
  })

  test('settings safety section lists links', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('safety-settings')).toBeVisible()
    await expect(page.getByRole('link', { name: 'My reports' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Appeals' })).toBeVisible()
  })

  test('profile safety menu on other user', async ({ page }) => {
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'networkidle' })
    await page.getByTestId('safety-overflow-menu-trigger').click()
    await expect(page.getByRole('menuitem', { name: 'Block' })).toBeVisible()
  })

  test('suspended banner when profile suspended', async ({ page }) => {
    await page.route('**/*.supabase.co/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/rest/v1/profiles_public') && url.includes(`id=eq.${READER.id}`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: READER.id,
              username: READER.username,
              display_name: READER.display_name,
              bio: 'Bio',
              avatar_url: null,
              banner_url: null,
              website: null,
              country: null,
              city: null,
              city_visible: false,
              timezone: 'UTC',
              language: 'en',
              role: 'writer',
              status: 'suspended',
              suspended_until: '2030-01-01T00:00:00.000Z',
              verified: false,
              who_can_message: 'everyone',
              follower_count: 0,
              following_count: 0,
              creation_count: 0,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ]),
        })
        return
      }
      await route.fallback()
    })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('suspended-banner')).toBeVisible()
  })
})
