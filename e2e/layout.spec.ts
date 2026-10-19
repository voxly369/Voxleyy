import { test, expect, type Page } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import fs from 'node:fs'
import path from 'node:path'

const viewports = [
  { name: '320x640', width: 320, height: 640 },
  { name: '375x812', width: 375, height: 812 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
] as const

const screenshotSizes = new Set(['375x812', '768x1024', '1440x900'])

type Screen = { name: string; path: string; action?: (page: Page) => Promise<void> }

const signedInScreens: Screen[] = [
  { name: 'home', path: '/' },
  { name: 'following', path: '/', action: async (page) => page.getByRole('tab', { name: 'Following' }).click() },
  { name: 'profile-own', path: '/u/readerone' },
  { name: 'discover', path: '/discover' },
  { name: 'saved', path: '/saved' },
  { name: 'library', path: '/library' },
  { name: 'messages', path: '/messages' },
  { name: 'settings', path: '/settings' },
]

async function assertNoHorizontalScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

async function assertNavVisibility(page: Page, width: number) {
  const sideNav = page.getByTestId('side-nav')
  const bottomNav = page.getByTestId('bottom-nav')
  if (width >= 1024) {
    await expect(sideNav).toBeVisible()
    await expect(bottomNav).toBeHidden()
  } else {
    await expect(bottomNav).toBeVisible()
    await expect(sideNav).toBeHidden()
  }
}

async function assertRightRail(page: Page, width: number, screenName: string) {
  const rail = page.getByRole('complementary', { name: 'Suggestions' })
  const onFeed = screenName === 'home' || screenName === 'following'
  if (width >= 1280 && onFeed) await expect(rail).toBeVisible()
  else await expect(rail).toHaveCount(0)
}

async function assertTouchTargets(page: Page, width: number) {
  const min = width >= 1024 ? 32 : 44
  const handles = await page.locator('button:visible, a:visible, input:visible, textarea:visible, [role="tab"]:visible').elementHandles()
  for (const handle of handles) {
    const box = await handle.boundingBox()
    if (!box) continue
    const inParagraph = await handle.evaluate((node) => Boolean(node.closest('p')))
    const tag = await handle.evaluate((node) => node.tagName.toLowerCase())
    if (tag === 'a' && inParagraph) continue
    expect(box.width).toBeGreaterThanOrEqual(min - 1)
    expect(box.height).toBeGreaterThanOrEqual(min - 1)
  }
}

async function assertReadingLineLength(page: Page) {
  const sample = page.locator('.voxly-rich-editor, article').first()
  if (!(await sample.count())) return
  const chars = await sample.evaluate((node) => {
    const probe = document.createElement('span')
    probe.textContent = 'abcdefghijklmnopqrstuvwxyz0123456789abcdef'
    probe.style.visibility = 'hidden'
    probe.style.position = 'absolute'
    node.appendChild(probe)
    const width = probe.getBoundingClientRect().width
    node.removeChild(probe)
    const lineWidth = node.getBoundingClientRect().width
    return Math.round((lineWidth / width) * 36)
  })
  expect(chars).toBeLessThanOrEqual(75)
}

async function assertImagesHealthy(page: Page) {
  const broken = await page.evaluate(() =>
    Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).length,
  )
  expect(broken).toBe(0)
}

async function visitScreen(page: Page, screen: Screen) {
  await page.goto(screen.path, { waitUntil: 'networkidle' })
  if (screen.action) await screen.action(page)
  await expect(page.locator('#main, main')).toBeVisible()
}

for (const scheme of ['dark', 'light'] as const) {
  for (const viewport of viewports) {
    test.fixme(`layout signed-in ${viewport.name} ${scheme}`, async ({ page }) => {
      fs.mkdirSync(path.join('e2e', 'screenshots'), { recursive: true })
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.emulateMedia({ colorScheme: scheme })

      for (const screen of signedInScreens) {
        await visitScreen(page, screen)
        await assertNoHorizontalScroll(page)
        await assertNavVisibility(page, viewport.width)
        await assertRightRail(page, viewport.width, screen.name)
        await assertTouchTargets(page, viewport.width)
        await assertReadingLineLength(page)
        await assertImagesHealthy(page)

        if (screenshotSizes.has(viewport.name)) {
          await page.screenshot({
            path: path.join('e2e', 'screenshots', `${screen.name}-${viewport.name}-${scheme}.png`),
            fullPage: true,
          })
        }
      }
    })

    test(`layout sign-in ${viewport.name} ${scheme}`, async ({ page }) => {
      await installSupabaseMocks(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/login', { waitUntil: 'networkidle' })
      await assertNoHorizontalScroll(page)
      await assertImagesHealthy(page)
    })
  }
}
