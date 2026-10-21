import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

const AUTHOR_BOOK = '/books/bb000000-0000-0000-0000-000000000099/builder'

test.describe('Book builder delete chapter', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('removes a chapter after confirmation', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await expect(page.getByText('Draft chapter B')).toBeVisible()
    const row = page.getByTestId('chapter-row-cc000000-0000-0000-0000-000000000098')
    await row.getByRole('button', { name: 'Remove' }).click()
    await row.getByRole('button', { name: 'Confirm remove' }).click()
    await expect(page.getByText('Draft chapter B')).toBeHidden()
  })
})
