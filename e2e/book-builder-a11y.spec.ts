import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { E2E_FREE_BOOK_ID } from './bookBuilderMocks.ts'

test.describe('Book builder accessibility', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
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
})
