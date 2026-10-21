import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
  setE2eCreationDetailOverride,
  OTHER,
} from './fixtures.ts'

const READER_BODY = {
  version: 1,
  format: 'rich',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Reader sample '.repeat(200) }] },
  ],
}

test.describe('Library and reader', () => {
  test.beforeEach(async ({ page }) => {
    setE2eCreationDetailOverride({
      id: SAMPLE_CREATION_ID,
      type: 'story',
      title: 'Long story',
      caption: null,
      body_text: 'Word '.repeat(400),
      body_json: READER_BODY,
      cover_url: null,
      status: 'published',
      audience: 'public',
      genre: null,
      mood: null,
      language: 'en',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      author_id: OTHER.id,
      author: {
        id: OTHER.id,
        username: OTHER.username,
        display_name: OTHER.display_name,
        avatar_url: null,
        verified: false,
      },
    })
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test.afterEach(() => {
    setE2eCreationDetailOverride(null)
  })

  test('opens reader from post and persists theme in localStorage', async ({ page }) => {
    await page.goto(`/c/${SAMPLE_CREATION_ID}`)
    await page.getByRole('link', { name: 'Read' }).click()
    await expect(page).toHaveURL(new RegExp(`/read/${SAMPLE_CREATION_ID}`))
    await expect(page.getByRole('button', { name: 'Reading settings' })).toBeVisible()
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByRole('radio', { name: 'Black' }).check()
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const raw = localStorage.getItem('voxly:reader-preferences')
          return raw?.includes('black') ?? false
        })
      })
      .toBe(true)
    await page.reload()
    await expect(page.locator('[data-reader-theme="black"]')).toBeVisible()
  })

  for (const width of [375, 767, 768, 1024, 1279, 1280, 1440]) {
    test(`library layout ${width}px no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/library?tab=purchased')
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
    })
  }
})
