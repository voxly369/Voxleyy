import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_FREE_CHAPTER_ID } from './bookBuilderMocks.ts'
import { seedBookEntitlement } from './fixtures.ts'

test.describe('Book builder accessibility', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('book page has no serious axe violations', async ({ page }) => {
    await page.goto(`/books/${E2E_FREE_BOOK_ID}`)
    await expect(page.getByTestId('book-page')).toBeVisible()
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  })

  test('library books tab exposes tab semantics', async ({ page }) => {
    await page.goto('/library?tab=books')
    await expect(page.getByRole('tab', { name: 'Books' })).toHaveAttribute('aria-selected', 'true')
  })

  for (const width of [375, 1280] as const) {
    test(`book builder surfaces axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
      await expect(page.getByRole('heading', { name: 'Book builder' })).toBeVisible()
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })

    test(`cover studio axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/books/bb000000-0000-0000-0000-000000000099/cover')
      await expect(page.getByRole('heading', { name: 'Cover studio' })).toBeVisible()
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })

    test(`book preview axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/books/bb000000-0000-0000-0000-000000000099/preview')
      await expect(page.getByTestId('book-preview-page')).toBeVisible()
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })

    test(`manuscript import confirm axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
      await page.getByRole('button', { name: 'Import manuscript' }).click()
      const fixture = `${process.cwd()}/e2e/fixtures/manuscript-smoke.txt`
      await page.locator('[data-testid="manuscript-file-input"]').setInputFiles(fixture)
      await expect(page.getByTestId('manuscript-import-confirm')).toBeVisible({ timeout: 15_000 })
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })

    test(`chapter manager axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
      await expect(page.getByTestId('chapter-manager')).toBeVisible()
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })

    test(`book chapter reader scroll axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
      await expect(page.getByTestId('book-chapter-reader')).toBeVisible()
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })

    test(`book chapter reader page mode axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/read/book/${E2E_FREE_BOOK_ID}/${E2E_FREE_CHAPTER_ID}`)
      await page.getByRole('button', { name: 'Page mode' }).click()
      await expect(page.locator('[data-reader-page-viewport]')).toBeVisible()
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })

    test(`library books shelf axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/library?tab=books')
      await expect(page.getByTestId('library-books-shelf')).toBeVisible()
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    })
  }
})
