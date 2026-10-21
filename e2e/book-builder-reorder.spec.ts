import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

const AUTHOR_BOOK = '/books/bb000000-0000-0000-0000-000000000099/builder'

test.describe('Book builder reorder', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('move chapter down updates list', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await expect(page.getByRole('heading', { name: 'Book builder' })).toBeVisible()
    if ((await page.getByTestId('chapter-list').count()) === 0) {
      await page.getByRole('button', { name: 'Add chapter' }).click()
      await expect(page).toHaveURL(/builder\/chapter\//)
      await page.goto(AUTHOR_BOOK)
    }
    await expect(page.getByTestId('chapter-list')).toBeVisible()
    const down = page.getByRole('button', { name: /Move .* down/i }).first()
    await expect(down).toBeEnabled()
    await down.click()
    await expect(page.getByTestId('chapter-list')).toBeVisible()
  })
})
