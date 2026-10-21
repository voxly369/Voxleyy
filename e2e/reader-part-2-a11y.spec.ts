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
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Accessibility highlight sample text.' }] }],
}

async function expectNoSeriousViolations(page: import('@playwright/test').Page, context: string, selector?: string) {
  let builder = new AxeBuilder({ page }).disableRules(['page-has-heading-one'])
  if (selector) builder = builder.include(selector)
  const results = await builder.analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${context}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

for (const width of [375, 1280]) {
  test.describe(`reader part 2 accessibility ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      resetLibraryReadingMocks()
      seedLibrarySave()
      setE2eCreationDetailOverride({
        id: SAMPLE_CREATION_ID,
        type: 'story',
        title: 'Long story',
        caption: null,
        body_text: 'Accessibility highlight sample text.',
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

    test('axe reader toolbar with bookmark control', async ({ page }) => {
      await page.goto(`/read/${SAMPLE_CREATION_ID}`)
      await expect(page.getByRole('button', { name: 'Bookmark this spot' })).toBeVisible()
      await expectNoSeriousViolations(page, 'reader toolbar', '[data-reader-theme]')
    })

    test('axe Library Highlights tab', async ({ page }) => {
      await page.goto('/library?tab=highlights')
      await expect(page.getByRole('tab', { name: 'Highlights' })).toHaveAttribute('aria-selected', 'true')
      await expectNoSeriousViolations(page, 'library highlights', 'main')
    })
  })
}
