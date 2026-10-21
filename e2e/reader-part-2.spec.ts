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
    await page.locator('[data-reader-paragraph-index="0"]').evaluate((el) => {
      const text = el.textContent ?? ''
      const start = text.indexOf('opening')
      const end = start + 'opening'.length
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node: Node | null = walker.nextNode()
      while (node) {
        const content = node.textContent ?? ''
        const idx = content.indexOf('opening')
        if (idx >= 0) {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, idx + 'opening'.length)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
          document.dispatchEvent(new Event('selectionchange'))
          return
        }
        node = walker.nextNode()
      }
    })
    await page.getByRole('button', { name: 'Look up' }).click()
    await expect(page.getByText('The beginning of something.')).toBeVisible()
  })
})
