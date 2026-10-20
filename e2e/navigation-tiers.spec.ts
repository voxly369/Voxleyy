import { test, expect, type Page } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

const tierViewports = [
  { width: 375, tier: 'bottom' as const },
  { width: 767, tier: 'bottom' as const },
  { width: 768, tier: 'rail' as const },
  { width: 1024, tier: 'rail' as const },
  { width: 1279, tier: 'rail' as const },
  { width: 1280, tier: 'rail' as const },
  { width: 1440, tier: 'rail' as const },
]

async function assertTier(page: Page, tier: 'bottom' | 'rail') {
  const bottom = page.getByTestId('bottom-nav')
  const rail = page.getByTestId('nav-rail')
  if (tier === 'bottom') {
    await expect(bottom).toBeVisible()
    await expect(rail).toBeHidden()
  } else {
    await expect(rail).toBeVisible()
    await expect(bottom).toBeHidden()
  }
}

async function assertNoHorizontalScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

for (const { width, tier } of tierViewports) {
  test(`navigation tier at ${width}px shows ${tier}`, async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await assertTier(page, tier)
    await assertNoHorizontalScroll(page)
  })
}

test('Create sheet opens and closes with keyboard at tablet width', async ({ page }) => {
  await installSupabaseMocks(page)
  await seedSignedInSession(page)
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })
  const create = page.getByRole('button', { name: 'Create' }).first()
  await create.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(create).toBeFocused()
})

test('More menu opens and closes with keyboard on rail', async ({ page }) => {
  await installSupabaseMocks(page)
  await seedSignedInSession(page)
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })
  const more = page.getByRole('button', { name: 'More' })
  await more.click()
  await expect(page.getByRole('menu', { name: 'More' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'More' })).toBeHidden()
  await expect(more).toBeFocused()
})

test('More menu closes on outside click', async ({ page }) => {
  await installSupabaseMocks(page)
  await seedSignedInSession(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })
  const more = page.getByRole('button', { name: 'More' })
  await more.click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.mouse.click(900, 400)
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(more).toBeFocused()
})
