import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installSupabaseMocks, seedSignedInSession, resetBookBuilderMocks } from './fixtures.ts'
import { resetCoverStudioMocks } from './coverStudioMocks.ts'
import { join } from 'node:path'

const COVER_PATH = '/books/bb000000-0000-0000-0000-000000000099/cover'

async function openEditor(page: import('@playwright/test').Page) {
  await page.goto(COVER_PATH)
  await expect(page.getByTestId('cover-studio-editor')).toBeVisible()
  await page.getByRole('button', { name: 'Poetry 1' }).click()
}

async function axeRegion(page: import('@playwright/test').Page, selector: string, label: string) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .disableRules(['page-has-heading-one', 'color-contrast'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([])
}

test.describe('Cover Studio 19B hardening a11y', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetCoverStudioMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  for (const width of [375, 1280] as const) {
    test(`axe editor gallery layers at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openEditor(page)
      await axeRegion(page, '[data-testid="cover-studio-editor"]', `editor-${width}`)
      await axeRegion(page, '[data-testid="cover-template-gallery"]', `gallery-${width}`)
      await axeRegion(page, '[data-testid="cover-studio-layers"]', `layers-${width}`)
    })
  }
})

test.describe('Cover Studio 19B hardening layout', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetCoverStudioMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  for (const width of [375, 767, 768, 1024, 1279, 1280, 1440] as const) {
    test(`editor layout ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openEditor(page)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
      const bottomNav = page.getByTestId('bottom-nav')
      if (width < 768) {
        await expect(bottomNav).toBeVisible()
        const editorBox = await page.getByTestId('cover-studio-editor').boundingBox()
        const navBox = await bottomNav.boundingBox()
        expect(editorBox).not.toBeNull()
        expect(navBox).not.toBeNull()
        const toolbarBox = await page.getByTestId('cover-studio-toolbar').boundingBox()
        if (toolbarBox && navBox) {
          expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(navBox.y + 2)
        }
      }
    })
  }
})

test.describe('Cover Studio 19B hardening import', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetCoverStudioMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('imports 2:3 finished cover and sets book cover', async ({ page }) => {
    const uploads: { url: string; buffer: Buffer }[] = []
    page.on('request', async (req) => {
      if (req.method() === 'POST' && req.url().includes('/storage/v1/object/covers/')) {
        uploads.push({ url: req.url(), buffer: req.postDataBuffer() ?? Buffer.alloc(0) })
      }
    })
    await openEditor(page)
    await page.getByRole('button', { name: 'Import finished cover' }).click()
    const pngPath = join(process.cwd(), 'public/icon-512.png')
    await page.getByTestId('cover-import-finished-input').setInputFiles(pngPath)
    await expect.poll(() => uploads.length).toBeGreaterThan(0)
    expect(uploads.some((u) => u.url.includes('/covers/11111111-1111-1111-1111-111111111111/'))).toBe(true)
    await expect(page.getByRole('button', { name: 'Image' })).toBeVisible()
  })
})

test.describe('Cover Studio 19B hardening gestures', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    resetCoverStudioMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('multi-select group ungroup align guide pinch zoom', async ({ page }) => {
    await openEditor(page)
    await page.getByRole('button', { name: 'Add text' }).click()
    await page.getByRole('button', { name: 'Add text' }).click()
    const layerButtons = page.getByTestId('cover-studio-layers').locator('li button').filter({ hasText: 'New text' })
    await layerButtons.nth(0).click()
    await layerButtons.nth(1).click({ modifiers: ['Shift'] })
    await page.getByTestId('cover-group').click()
    await page.getByTestId('cover-ungroup').click()
    await page.getByTestId('cover-align-center').click()
    await expect(page.getByTestId('cover-snap-guide-v')).toBeVisible()

    const canvas = page.getByTestId('cover-studio-canvas').locator('[aria-label="Cover canvas"]')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const zoomBefore = await page.getByTestId('cover-studio-canvas').getByText(/%$/).textContent()
    await canvas.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: cx - 40, clientY: cy })
    await canvas.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: cx + 40, clientY: cy })
    await canvas.dispatchEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: cx - 80, clientY: cy })
    await canvas.dispatchEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: cx + 80, clientY: cy })
    await canvas.dispatchEvent('pointerup', { pointerId: 1 })
    await canvas.dispatchEvent('pointerup', { pointerId: 2 })
    const zoomAfter = await page.getByTestId('cover-studio-canvas').locator('span').first().textContent()
    expect(zoomAfter).not.toBe(zoomBefore)
  })
})
