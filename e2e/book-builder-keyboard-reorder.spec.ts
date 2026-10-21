import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

const AUTHOR_BOOK = '/books/bb000000-0000-0000-0000-000000000099/builder'

test.describe('Book builder keyboard reorder', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('drag handle supports Space pick up and drop with live announcement', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await expect(page.getByTestId('chapter-list')).toBeVisible()
    const handles = page.getByTestId('drag-handle')
    await handles.first().focus()
    await page.keyboard.press('Space')
    await expect(page.locator('.sr-only[aria-live="polite"]')).toContainText(/Picked up/i)
    await page.keyboard.press('ArrowDown')
    await handles.nth(1).focus()
    await page.keyboard.press('Space')
    await expect(page.locator('.sr-only[aria-live="polite"]')).toContainText(/position/i)
  })

  test('persists reordered chapters after reload', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    const rowA = page.getByTestId('chapter-row-cc000000-0000-0000-0000-000000000099')
    const reorder = page.waitForResponse((resp) => resp.url().includes('reorder_book_chapters'))
    await rowA.getByRole('button', { name: 'Down' }).click()
    await reorder
    await page.reload()
    const titles = page.getByTestId('chapter-list').locator('.font-serif.text-lg')
    await expect(titles.first()).toContainText('Draft chapter B')
  })
})
