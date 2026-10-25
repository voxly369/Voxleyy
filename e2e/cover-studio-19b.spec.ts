import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { resetCoverStudioMocks } from './coverStudioMocks.ts'

test.describe('Cover Studio 19B', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetCoverStudioMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('opens editor, applies template, and exports png', async ({ page }) => {
    const uploads: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/storage/v1/object/covers/')) uploads.push(req.url())
    })
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/cover')
    await expect(page.getByTestId('cover-studio-editor')).toBeVisible()
    await page.getByRole('button', { name: 'Poetry 1' }).click()
    await expect(page.getByTestId('cover-design-save-status')).toBeVisible()
    await page.getByTestId('cover-export-png').click()
    await expect.poll(() => uploads.some((u) => u.includes('/covers/11111111-1111-1111-1111-111111111111/'))).toBe(true)
  })

  test('lists saved cover designs', async ({ page }) => {
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/cover')
    await page.getByRole('button', { name: 'Poetry 1' }).click()
    await page.getByRole('textbox', { name: 'Design name' }).fill('E2E smoke cover')
    await page.getByRole('textbox', { name: 'Design name' }).blur()
    await page.goto('/cover-designs')
    await expect(page.getByTestId('cover-designs-list')).toBeVisible()
    await expect(page.getByText('E2E smoke cover')).toBeVisible()
  })

  test('import finished cover opens modal', async ({ page }) => {
    await page.goto('/books/bb000000-0000-0000-0000-000000000099/cover')
    await page.getByRole('button', { name: 'Import finished cover' }).click()
    await expect(page.getByTestId('cover-import-finished-input')).toBeVisible()
  })
})
