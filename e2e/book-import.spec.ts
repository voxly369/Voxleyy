import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import path from 'node:path'

test.describe('Book manuscript import', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('imports plain text fixture', async ({ page }) => {
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/builder')
    await page.getByRole('button', { name: 'Import manuscript' }).click()
    const fixture = path.join(process.cwd(), 'e2e/fixtures/manuscript-smoke.txt')
    await page.locator('input[type="file"]').setInputFiles(fixture)
    await expect(page.getByText(/chapters detected/i)).toBeVisible({ timeout: 15_000 })
  })
})
