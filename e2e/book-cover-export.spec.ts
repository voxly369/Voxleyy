import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'

test.describe('Book cover export', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('cover export uploads png to storage path', async ({ page }) => {
    const uploads: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/storage/v1/object/covers/')) uploads.push(req.url())
    })
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/cover')
    await page.getByTestId('cover-export-png').click()
    await expect.poll(() => uploads.some((u) => u.includes('/covers/11111111-1111-1111-1111-111111111111/'))).toBe(true)
    expect(uploads[0]).toMatch(/book-.*-cover\.png/)
  })
})
