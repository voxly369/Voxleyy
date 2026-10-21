import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
  setE2eCreationDetailOverride,
  OTHER,
  resetLibraryReadingMocks,
  seedLibrarySave,
  seedReadingProgress,
} from './fixtures.ts'

const READER_BODY = {
  version: 1,
  format: 'rich',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Opening paragraph. '.repeat(80) }] },
    { type: 'heading', level: 2, content: [{ type: 'text', text: 'Middle chapter' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Middle paragraph. '.repeat(120) }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Closing paragraph. '.repeat(80) }] },
  ],
}

function seedCreationDetail() {
  setE2eCreationDetailOverride({
    id: SAMPLE_CREATION_ID,
    type: 'story',
    title: 'Long story',
    caption: null,
    body_text: 'Word '.repeat(400),
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

test.describe('Library and reader 10B', () => {
  test.beforeEach(async ({ page }) => {
    resetLibraryReadingMocks()
    seedCreationDetail()
    seedLibrarySave()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test.afterEach(() => {
    setE2eCreationDetailOverride(null)
    resetLibraryReadingMocks()
  })

  test('creates a collection and adds a post from the post page', async ({ page }) => {
    await page.goto(`/c/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Add to collection' }).click()
    await page.getByLabel(/New collection/i).fill('Night reading')
    await page.getByRole('button', { name: 'Create and add' }).click()
    await expect(page.getByRole('heading', { name: 'Add to collection' })).toBeHidden()
    await page.goto('/library?tab=collections')
    await expect(page.getByText('Night reading')).toBeVisible()
  })

  test('removes a saved item from Library Saved', async ({ page }) => {
    await page.goto('/library?tab=saved')
    await expect(page.getByText('Long story')).toBeVisible()
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText('Nothing saved yet')).toBeVisible()
  })

  test('updates progress percentage while scrolling the reader', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    const article = page.locator('[data-reader-scroll]')
    await article.evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.4
      el.dispatchEvent(new Event('scroll'))
    })
    await expect.poll(() => page.locator('header p[aria-live="polite"]').textContent()).toMatch(/\d+%/)
  })

  test('shows Resume where you left off after leaving the reader', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    const article = page.locator('[data-reader-scroll]')
    await article.evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.55
      el.dispatchEvent(new Event('scroll'))
    })
    await page.waitForTimeout(400)
    await page.goto(`/c/${SAMPLE_CREATION_ID}`)
    await expect(page.getByText(/Resume where you left off/i)).toBeVisible()
  })

  test('clears reading history behind confirm modal', async ({ page }) => {
    seedReadingProgress({ percent: 33, position: 1, positionOffset: 0.2 })
    await page.goto('/library?tab=history')
    await expect(page.getByText('Long story')).toBeVisible()
    await page.getByRole('button', { name: 'Clear history' }).first().click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear history' }).click()
    await expect(page.getByText('No reading history')).toBeVisible()
  })

  test('opens Continue reading from Library at saved paragraph after reload', async ({ page }) => {
    seedReadingProgress({ percent: 50, position: 1, positionOffset: 0.1 })
    await page.goto('/library?tab=continue')
    await page.getByRole('link', { name: /Long story/i }).click()
    await expect(page).toHaveURL(new RegExp(`/read/${SAMPLE_CREATION_ID}`))
    await expect(page.locator('[data-reader-paragraph-index="1"]')).toBeVisible()
    await page.reload()
    await expect(page.locator('[data-reader-paragraph-index="1"]')).toBeVisible()
  })

  test('page mode renders body once and turns pages by keyboard and tap', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByText('Page mode', { exact: true }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator('[data-reader-page-body]')).toHaveCount(1)
    const snippet = 'Opening paragraph.'
    expect(await page.locator('[data-reader-page-body]').textContent()).toContain(snippet)
    expect(await page.evaluate(() => document.querySelectorAll('[data-reader-page-body]').length)).toBe(1)
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-reader-page-viewport]').getByText(/Page 2 of/i)).toBeVisible()
    const viewport = page.locator('[data-reader-page-viewport]')
    const box = await viewport.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.5)
    }
    await expect(page.locator('[data-reader-page-viewport]').getByText(/Page 3 of/i)).toBeVisible()
  })

  test('page mode keeps the same paragraph after text size change', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByText('Page mode', { exact: true }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Contents' }).click()
    await page.getByRole('button', { name: 'Middle chapter' }).click()
    await expect(page.locator('#reader-heading-1')).toBeFocused()
    await page.getByRole('button', { name: 'Reading settings' }).click()
    const slider = page.getByLabel('Text size')
    await slider.evaluate((el) => {
      ;(el as HTMLInputElement).value = '4'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.getByRole('button', { name: 'Done' }).click()
    const stillOnParagraph = await page.evaluate(() => {
      const el = document.querySelector('[data-reader-paragraph-index="1"]')
      if (!(el instanceof HTMLElement)) return false
      const rect = el.getBoundingClientRect()
      return rect.top >= 0 && rect.top < window.innerHeight
    })
    expect(stillOnParagraph).toBe(true)
  })

  test('table of contents navigates in scroll mode', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Contents' }).click()
    await page.getByRole('button', { name: 'Middle chapter' }).click()
    await expect(page.locator('#reader-heading-1')).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Table of contents' })).toBeHidden()
  })

  test('table of contents navigates in page mode', async ({ page }) => {
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await page.getByRole('button', { name: 'Reading settings' }).click()
    await page.getByText('Page mode', { exact: true }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Contents' }).click()
    await page.getByRole('button', { name: 'Middle chapter' }).click()
    await expect(page.locator('#reader-heading-1')).toBeFocused()
  })

  test('resume by paragraph survives font size change in scroll mode', async ({ page }) => {
    seedReadingProgress({ percent: 50, position: 2, positionOffset: 0.2 })
    await page.goto(`/read/${SAMPLE_CREATION_ID}`)
    await expect(page.locator('[data-reader-paragraph-index="2"]')).toBeVisible()
    await page.getByRole('button', { name: 'Reading settings' }).click()
    const slider = page.getByLabel('Text size')
    await slider.evaluate((el) => {
      ;(el as HTMLInputElement).value = '0'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.getByRole('button', { name: 'Done' }).click()
    const top = await page.evaluate(() => {
      const el = document.querySelector('[data-reader-paragraph-index="2"]')
      return el?.getBoundingClientRect().top ?? 0
    })
    expect(top).toBeGreaterThan(0)
    expect(top).toBeLessThan(700)
  })
})
