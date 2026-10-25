import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
  setE2eCreationDetailOverride,
} from './fixtures.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { setE2eConsentsCurrent } from './preBetaMocks.ts'

const DRAFT_ID = '00000000-0000-0000-0000-0000000000d1'

for (const width of [375, 1280]) {
  test.describe(`stage C a11y ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await installSupabaseMocks(page)
      setE2eOnboardingComplete()
      setE2eConsentsCurrent()
      await seedSignedInSession(page)
    })

    test(`language picker axe at ${width}px`, async ({ page }) => {
      await page.goto(`/create/${DRAFT_ID}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled({ timeout: 15_000 })
      await page.getByRole('button', { name: 'Publish' }).click()
      await expect(page.getByTestId('publish-language-picker')).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="publish-language-picker-search"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `language-picker-${width}`).toEqual([])
    })

    test(`Arabic published post axe at ${width}px`, async ({ page }) => {
      setE2eCreationDetailOverride({
        id: SAMPLE_CREATION_ID,
        type: 'written_post',
        title: 'مرحبا',
        caption: null,
        body_text: 'هذا نص عربي للاختبار.',
        body_json: {
          version: 1,
          format: 'rich',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'هذا نص عربي للاختبار.' }] }],
        },
        language: 'ar',
        status: 'published',
        audience: 'public',
        is_removed: false,
        removed_reason: null,
        cover_url: null,
        genre: null,
        mood: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        author_id: '22222222-2222-2222-2222-222222222222',
        author: {
          id: '22222222-2222-2222-2222-222222222222',
          username: 'writertwo',
          display_name: 'Writer Two',
          avatar_url: null,
          verified: false,
        },
      })
      await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('creation-body')).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="creation-title"]')
        .include('[data-testid="creation-body"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `rtl-post-${width}`).toEqual([])
    })

    test(`RTL draft creation page axe at ${width}px`, async ({ page }) => {
      await page.goto(`/create/${DRAFT_ID}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled({ timeout: 15_000 })
      await page.getByRole('textbox', { name: /title/i }).fill('مرحبا')
      await page.getByRole('button', { name: 'Publish' }).click()
      await expect(page.getByTestId('publish-language-picker')).toBeVisible()
      await page.getByTestId('publish-language-picker-search').fill('Arab')
      await page.getByRole('option', { name: /العربية|Arabic/i }).click()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="publish-language-picker"]')
        .include('#main')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `rtl-draft-${width}`).toEqual([])
    })

    test(`discover language filter chips axe at ${width}px`, async ({ page }) => {
      await page.goto('/discover/browse?sort=trending', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('discover-language-filters')).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include('[data-testid="discover-language-filters"]')
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious, `language-filters-${width}`).toEqual([])
    })
  })
}
