import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
  setE2eCreationDetailOverride,
  OTHER,
  resetLibraryReadingMocks,
  seedLibrarySave,
} from './fixtures.ts'

const READER_BODY = {
  version: 1,
  format: 'rich',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Accessibility sample. '.repeat(100) }] }],
}

async function expectNoSeriousViolations(
  page: import('@playwright/test').Page,
  context: string,
  selector?: string,
) {
  let builder = new AxeBuilder({ page }).disableRules(['page-has-heading-one'])
  if (selector) builder = builder.include(selector)
  const results = await builder.analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

for (const width of [375, 1280]) {
  test.describe(`reader and library accessibility ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      resetLibraryReadingMocks()
      seedLibrarySave()
      setE2eCreationDetailOverride({
        id: SAMPLE_CREATION_ID,
        type: 'story',
        title: 'Long story',
        caption: null,
        body_text: 'Word '.repeat(200),
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
      await page.setViewportSize({ width, height: 900 })
      await seedSignedInSession(page)
      await installSupabaseMocks(page)
    })

    test.afterEach(() => {
      setE2eCreationDetailOverride(null)
      resetLibraryReadingMocks()
    })

    test('axe Library tabs', async ({ page }) => {
      await page.goto('/library?tab=saved')
      await expect(page.getByRole('tablist', { name: 'Library sections' })).toBeVisible()
      await expectNoSeriousViolations(page, 'library tabs', '[aria-label="Library sections"]')
    })

    test('axe reader scroll mode and settings', async ({ page }) => {
      await page.goto(`/read/${SAMPLE_CREATION_ID}`)
      await expect(page.locator('[data-reader-theme]')).toBeVisible()
      await expectNoSeriousViolations(page, 'reader scroll', '[data-reader-theme]')
      await page.getByRole('button', { name: 'Reading settings' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectNoSeriousViolations(page, 'reader settings', '[role="dialog"]')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('heading', { name: 'Reading settings' })).toBeHidden()
    })

    test('axe reader page mode', async ({ page }) => {
      await page.goto(`/read/${SAMPLE_CREATION_ID}`)
      await page.getByRole('button', { name: 'Reading settings' }).click()
      await page.getByRole('radio', { name: 'Page mode' }).check({ force: true })
      await page.getByRole('button', { name: 'Done' }).click()
      await expectNoSeriousViolations(page, 'reader page mode', '[data-reader-theme]')
    })

    test('keyboard settings change and Escape returns focus to settings button', async ({ page }) => {
      await page.goto(`/read/${SAMPLE_CREATION_ID}`)
      await page.getByRole('button', { name: 'Reading settings' }).focus()
      await page.keyboard.press('Enter')
      await page.getByRole('radio', { name: 'Sepia' }).check()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Reading settings' })).toBeFocused()
    })

    test('axe add-to-collection modal from post page', async ({ page }) => {
      await page.goto(`/c/${SAMPLE_CREATION_ID}`)
      await page.getByRole('button', { name: 'Add to collection' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectNoSeriousViolations(page, 'add to collection modal', '[role="dialog"]')
    })
  })
}
