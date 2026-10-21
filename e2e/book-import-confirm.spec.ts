import { test, expect } from '@playwright/test'
import path from 'node:path'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { PDF_NO_SELECTABLE_TEXT } from '../src/lib/books/pdfImport.ts'
import { MANUSCRIPT_FILE_TOO_LARGE } from '../src/lib/books/manuscriptImportLimits.ts'

const AUTHOR_BOOK = '/books/bb000000-0000-0000-0000-000000000099/builder'

test.describe('Manuscript import confirm', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('confirms import after rename, merge, split, delete, and reorder', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await page.getByRole('button', { name: 'Import manuscript' }).click()
    const fixture = path.join(process.cwd(), 'e2e/fixtures/manuscript-smoke.txt')
    await page.locator('[data-testid="manuscript-file-input"]').setInputFiles(fixture)
    await expect(page.getByTestId('manuscript-import-confirm')).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Chapter 1 title').fill('Renamed opening')
    await page.getByRole('button', { name: 'Split' }).first().click()
    await expect(page.getByLabel(/Chapter 2 title/i)).toHaveValue(/continued/i)
    await page.getByRole('button', { name: 'Move chapter 1 down' }).click()
    await page.getByRole('button', { name: 'Merge next' }).first().click()
    await page.getByRole('button', { name: 'Import chapters' }).click()
    await expect(page.getByTestId('manuscript-import-confirm')).toBeHidden()
  })

  test('detects chapters from docx heading styles', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await page.getByRole('button', { name: 'Import manuscript' }).click()
    const fixture = path.join(process.cwd(), 'e2e/fixtures/manuscript-headings.docx')
    await page.locator('[data-testid="manuscript-file-input"]').setInputFiles(fixture)
    await expect(page.getByTestId('manuscript-import-confirm')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/2 chapters ready/i)).toBeVisible()
  })

  test('shows exact PDF error for empty PDF', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await page.getByRole('button', { name: 'Import manuscript' }).click()
    const fixture = path.join(process.cwd(), 'e2e/fixtures/empty.pdf')
    await page.locator('[data-testid="manuscript-file-input"]').setInputFiles(fixture)
    await expect(page.getByRole('alert')).toHaveText(PDF_NO_SELECTABLE_TEXT, { timeout: 20_000 })
  })

  test('rejects files over 10 MB', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await page.getByRole('button', { name: 'Import manuscript' }).click()
    const big = path.join(process.cwd(), 'e2e/fixtures/manuscript-smoke.txt')
    await page.evaluate(
      ({ selector, tooLargeMessage }) => {
        const input = document.querySelector(selector) as HTMLInputElement | null
        if (!input) throw new Error('missing input')
        const blob = new Blob(['x'.repeat(10 * 1024 * 1024 + 1)], { type: 'text/plain' })
        const file = new File([blob], 'huge.txt', { type: 'text/plain' })
        const dt = new DataTransfer()
        dt.items.add(file)
        input.files = dt.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      },
      { selector: '[data-testid="manuscript-file-input"]', tooLargeMessage: MANUSCRIPT_FILE_TOO_LARGE },
    )
    await expect(page.getByRole('alert')).toHaveText(MANUSCRIPT_FILE_TOO_LARGE)
  })

  test('deletes a chapter on the confirm screen', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await page.getByRole('button', { name: 'Import manuscript' }).click()
    const fixture = path.join(process.cwd(), 'e2e/fixtures/manuscript-smoke.txt')
    await page.locator('[data-testid="manuscript-file-input"]').setInputFiles(fixture)
    await expect(page.getByTestId('manuscript-import-confirm')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Split' }).first().click()
    await page.getByRole('button', { name: 'Delete' }).nth(1).click()
    await expect(page.getByText(/1 chapters ready/i)).toBeVisible()
  })

  test('rejects manuscripts over the chapter limit', async ({ page }) => {
    await page.goto(AUTHOR_BOOK)
    await page.getByRole('button', { name: 'Import manuscript' }).click()
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="manuscript-file-input"]') as HTMLInputElement | null
      if (!input) throw new Error('missing input')
      const lines = ['Chapter 1\n\nBody with enough words to avoid merge.\n\n']
      const filler = 'word '.repeat(120)
      for (let i = 2; i <= 201; i += 1) {
        lines.push(`Chapter ${i}\n\n${filler} segment ${i}.\n\n`)
      }
      const blob = new Blob([lines.join('')], { type: 'text/plain' })
      const file = new File([blob], 'too-many-chapters.txt', { type: 'text/plain' })
      const dt = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByRole('alert')).toContainText(/Too many chapters detected \(max 200\)/i)
  })
})
