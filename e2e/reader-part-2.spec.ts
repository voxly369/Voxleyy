import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
  setE2eCreationDetailOverride,
  OTHER,
  resetLibraryReadingMocks,
  seedLibrarySave,
} from './fixtures.ts'
import { seedReaderBookmark, seedReaderHighlight } from './libraryReadingMocks.ts'
import { selectWordInParagraph } from './reader-part-2-helpers.ts'

const READER_BODY = {
  version: 1,
  format: 'rich',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Highlightable opening sentence for tests.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph with more words.' }] },
  ],
}

function seedCreationDetail() {
  setE2eCreationDetailOverride({
    id: SAMPLE_CREATION_ID,
    type: 'story',
    title: 'Long story',
    caption: null,
    body_text: 'Highlightable opening sentence for tests. Second paragraph with more words.',
    body_json: READER_BODY,
    cover_url: null,
    status: 'published',
    audience: 'public',
    genre: null,
    mood: null,
    language: 'en',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    author_id: OTHER.id,
    author: {
      id: OTHER.id,
      username: OTHER.username,
      display_name: OTHER.display_name,
      avatar_url: null,
      verified: false,
    },
  })
}

test.describe('Reader part 2', () => {
  test.beforeEach(async ({ page }) => {
    resetLibraryReadingMocks()
    seedCreationDetail()
    seedLibrarySave()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    await page.route('https://api.dictionaryapi.dev/api/v2/entries/en/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            word: 'opening',
            meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The beginning of something.' }] }],
          },
        ]),
      })
    })
  })

  test.afterEach(() => {
    setE2eCreationDetailOverride(null)
    resetLibraryReadingMocks()
  })

  test('renders a saved highlight in the reader', async ({ page }) => {
    seedReaderHighlight({ quote: 'Highlightable opening', colour: 'yellow', startParagraph: 0 })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.waitForResponse((resp) => resp.url().includes('/rest/v1/reader_highlights'))
    await expect(page.locator('mark')).toContainText('Highlightable')
  })

  test('creates a bookmark from the reader header', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    const createBookmark = page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_bookmarks') && resp.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Bookmark this spot' }).click()
    const response = await createBookmark
    expect(response.ok()).toBeTruthy()
    const body = (await response.json()) as unknown[]
    expect(body.length).toBeGreaterThan(0)
  })

  test('lists highlights in Library Highlights tab', async ({ page }) => {
    seedReaderHighlight({ quote: 'Highlightable opening', colour: 'green' })
    await page.goto('/library?tab=highlights')
    await expect(page.getByText('Highlightable opening')).toBeVisible()
  })

  test('shows seeded bookmark in reading settings', async ({ page }) => {
    seedReaderBookmark({ paragraph: 0 })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.waitForResponse((resp) => resp.url().includes('/rest/v1/reader_bookmarks'))
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await expect(page.getByRole('button', { name: 'Paragraph 1' })).toBeVisible()
  })

  test('looks up a selected word', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await selectWordInParagraph(page, 0, 'opening')
    await page.getByRole('button', { name: 'Look up' }).click()
    await expect(page.getByText('The beginning of something.')).toBeVisible()
  })

  test('creates a highlight and persists after reload and font size change', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await selectWordInParagraph(page, 0, 'Highlightable')
    await expect(page.getByRole('toolbar', { name: 'Highlight actions' })).toBeVisible()
    const createHighlight = page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_highlights') && resp.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Highlight Yellow' }).click()
    await createHighlight
    await expect(page.locator('mark')).toContainText('Highlightable')
    await page.reload()
    await expect(page.locator('mark')).toContainText('Highlightable')
    await page.getByRole('button', { name: 'Reading settings' }).click()
    const slider = page.getByLabel('Text size')
    await slider.evaluate((el) => {
      ;(el as HTMLInputElement).value = '4'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator('mark')).toContainText('Highlightable')
  })

  test('adds and edits a highlight note', async ({ page }) => {
    seedReaderHighlight({ quote: 'Highlightable opening', colour: 'blue' })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.locator('mark').click()
    await page.getByLabel('Note').fill('My reading note')
    const patch = page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_highlights') && resp.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: 'Save' }).click()
    await patch
    await page.reload()
    await page.locator('mark').click()
    await expect(page.getByLabel('Note')).toHaveValue('My reading note')
  })

  test('deletes a highlight', async ({ page }) => {
    seedReaderHighlight({ quote: 'Highlightable opening', colour: 'pink' })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.locator('mark').click()
    const del = page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_highlights') && resp.request().method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Delete highlight' }).click()
    await del
    await expect(page.locator('mark')).toHaveCount(0)
  })

  test('jumps to a bookmark in scroll mode', async ({ page }) => {
    seedReaderBookmark({ paragraph: 1 })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByRole('button', { name: 'Paragraph 2' }).click()
    await expect(page.locator('[data-reader-paragraph-index="1"]')).toBeInViewport()
  })

  test('jumps to a bookmark in page mode', async ({ page }) => {
    seedReaderBookmark({ paragraph: 1 })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByText('Page mode', { exact: true }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByRole('button', { name: 'Paragraph 2' }).click()
    await expect(page.locator('[data-reader-paragraph-index="1"]')).toBeVisible()
  })

  test('Library Highlights tab filter search and open in reader', async ({ page }) => {
    seedReaderHighlight({ quote: 'Unique filter phrase', colour: 'orange' })
    seedReaderHighlight({ quote: 'Other quote', colour: 'yellow' })
    await page.goto('/library?tab=highlights')
    await page.getByLabel('Filter by colour').selectOption('orange')
    await expect(page.getByText('Unique filter phrase')).toBeVisible()
    await expect(page.getByText('Other quote')).toHaveCount(0)
    await page.getByLabel('Search highlights').fill('Unique filter')
    await expect.poll(async () => (await page.getByText('Unique filter phrase').count()) > 0).toBe(true)
    await page.getByRole('link', { name: /Open in reader/i }).first().click()
    await expect(page).toHaveURL(new RegExp(`/read/${SAMPLE_CREATION_ID}`))
  })

  test('look up not found shows fallback link', async ({ page }) => {
    await page.route('https://api.dictionaryapi.dev/api/v2/entries/en/*', async (route) => {
      await route.fulfill({ status: 404, body: '{}' })
    })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await selectWordInParagraph(page, 0, 'opening')
    await page.getByRole('button', { name: 'Look up' }).click()
    await expect(page.getByText(/No definition found/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Search the web' })).toBeVisible()
  })

  test('look up offline shows offline message', async ({ page, context }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await selectWordInParagraph(page, 0, 'sentence')
    await expect(page.getByRole('toolbar', { name: 'Highlight actions' })).toBeVisible()
    await context.setOffline(true)
    await page.getByRole('button', { name: 'Look up' }).click()
    await expect(page.getByText(/You are offline/i)).toBeVisible()
  })

  test('save offline add highlight while offline and sync when online', async ({ page, context }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByLabel('Save offline on this device').click()
    await expect.poll(() => page.getByLabel('Save offline on this device').isChecked()).toBe(true)
    await page.getByRole('button', { name: 'Done' }).click()
    await context.setOffline(true)
    await selectWordInParagraph(page, 1, 'Second')
    await page.getByRole('button', { name: 'Highlight Green' }).click()
    await expect(page.locator('mark')).toContainText('Second')
    await context.setOffline(false)
    await page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/reader_highlights') && resp.request().method() === 'POST',
    )
  })
})
