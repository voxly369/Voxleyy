import { test, expect, type Page, type Locator } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
} from './fixtures.ts'
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

type ScreenDef = {
  name: string
  path: string
  signedIn: boolean
  setup?: (page: Page) => Promise<void>
  dialogFocus?: (page: Page) => Promise<{ opener: Locator }>
  skipReadingLine?: boolean
  skipRightRail?: boolean
  skipNav?: boolean
}

const screens: ScreenDef[] = [
  { name: 'home', path: '/', signedIn: true },
  {
    name: 'following',
    path: '/',
    signedIn: true,
    setup: async (page) => page.getByRole('tab', { name: 'Following' }).click(),
  },
  { name: 'profile-own', path: '/u/readerone', signedIn: true },
  { name: 'profile-other', path: '/u/writertwo', signedIn: true },
  { name: 'creation', path: `/c/${SAMPLE_CREATION_ID}`, signedIn: true },
  {
    name: 'create-sheet',
    path: '/',
    signedIn: true,
    setup: async (page) => {
      await page.getByRole('button', { name: 'Create' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
    },
    dialogFocus: async (page) => ({ opener: page.getByRole('button', { name: 'Create' }).first() }),
    skipReadingLine: true,
  },
  {
    name: 'comments',
    path: '/',
    signedIn: true,
    setup: async (page) => {
      const comments = page.getByRole('button', { name: 'Comments' }).first()
      await expect(comments).toBeVisible()
      await comments.click()
      await expect(page.getByRole('dialog')).toBeVisible()
    },
    dialogFocus: async (page) => ({
      opener: page.locator('article').first().getByRole('button', { name: 'Comments' }),
    }),
    skipReadingLine: true,
  },
  { name: 'editor-text', path: '/create/new/poem', signedIn: true, skipReadingLine: true },
  { name: 'editor-quote', path: '/create/new/quote_card', signedIn: true, skipReadingLine: true },
  { name: 'drafts', path: '/u/readerone?tab=drafts', signedIn: true },
  { name: 'saved', path: '/library/saved', signedIn: true },
  { name: 'library', path: '/library', signedIn: true },
  { name: 'discover', path: '/discover', signedIn: true },
  { name: 'settings', path: '/settings', signedIn: true },
  { name: 'sign-in', path: '/login', signedIn: false, skipNav: true, skipRightRail: true },
]

function attachConsoleGuard(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (text.includes('favicon')) return
    errors.push(text)
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

async function assertNoHorizontalScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

async function assertInViewport(page: Page) {
  const overflow = await page.evaluate(() => {
    const vw = window.innerWidth
    const allowedScroll = (el: Element) => {
      const style = window.getComputedStyle(el)
      return style.overflowX === 'auto' || style.overflowX === 'scroll'
    }
    const offenders: string[] = []
    for (const el of document.querySelectorAll('body *')) {
      if (!(el instanceof HTMLElement)) continue
      if (allowedScroll(el) || el.closest('[role="tablist"]')) continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      if (rect.right > vw + 1 || rect.left < -1) {
        offenders.push(`${el.tagName}.${el.className}`.slice(0, 80))
      }
    }
    return offenders.slice(0, 5)
  })
  expect(overflow, overflow.join(', ')).toEqual([])
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
  const onFeed =
    screenName === 'home' ||
    screenName === 'following' ||
    screenName === 'create-sheet' ||
    screenName === 'comments'
  if (width >= 1280 && onFeed) await expect(rail).toBeVisible()
  else await expect(rail).toBeHidden()
}

async function assertTouchTargets(page: Page, width: number) {
  const min = width >= 1024 ? 32 : 44
  const handles = await page
    .locator('button:visible, a:visible, input:visible, textarea:visible, [role="tab"]:visible')
    .elementHandles()
  for (const handle of handles) {
    const box = await handle.boundingBox()
    if (!box) continue
    const meta = await handle.evaluate(
      (node, minSize) => {
        const tag = node.tagName.toLowerCase()
        const inputType = tag === 'input' ? (node as HTMLInputElement).type : ''
        const label = node.closest('label')
        const labelBox = label?.getBoundingClientRect()
        const labelHitArea =
          Boolean(label) &&
          labelBox !== undefined &&
          labelBox.height >= minSize - 1 &&
          labelBox.width >= minSize - 1
        return {
          tag,
          inputType,
          inParagraph: Boolean(node.closest('p')),
          srOnly:
            node.classList.contains('sr-only') ||
            Boolean(node.closest('.sr-only')) ||
            node.getAttribute('aria-hidden') === 'true',
          labelHitArea,
        }
      },
      min,
    )
    if (meta.srOnly) continue
    if (meta.tag === 'a' && meta.inParagraph) continue
    if ((meta.inputType === 'radio' || meta.inputType === 'checkbox') && meta.labelHitArea) continue
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

async function assertDialogFocus(page: Page, screen: ScreenDef) {
  if (!screen.dialogFocus) return
  const { opener } = await screen.dialogFocus(page)
  const dialog = page.getByRole('dialog').first()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Tab')
  const focusInDialog = await dialog.evaluate((node) => node.contains(document.activeElement))
  expect(focusInDialog).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
}

async function visitScreen(page: Page, screen: ScreenDef) {
  if (screen.signedIn) await seedSignedInSession(page)
  await page.goto(screen.path, { waitUntil: 'networkidle' })
  if (screen.setup) await screen.setup(page)
  if (screen.signedIn) {
    await expect(page.locator('#main')).toBeVisible()
  }
}

for (const scheme of ['dark', 'light'] as const) {
  for (const viewport of viewports) {
    test(`layout matrix ${viewport.name} ${scheme}`, async ({ page }) => {
      fs.mkdirSync(path.join('e2e', 'screenshots'), { recursive: true })
      await installSupabaseMocks(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.emulateMedia({ colorScheme: scheme })

      for (const screen of screens) {
        const consoleErrors = attachConsoleGuard(page)
        await visitScreen(page, screen)
        if (screen.dialogFocus && screen.setup) {
          await assertDialogFocus(page, screen)
        }

        await assertNoHorizontalScroll(page)
        await assertInViewport(page)
        if (!screen.skipNav && screen.signedIn) await assertNavVisibility(page, viewport.width)
        if (!screen.skipRightRail) await assertRightRail(page, viewport.width, screen.name)
        if (screen.signedIn) {
          try {
            await assertTouchTargets(page, viewport.width)
          } catch (error) {
            throw new Error(`${screen.name} @ ${viewport.name}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
        if (!screen.skipReadingLine) await assertReadingLineLength(page)
        await assertImagesHealthy(page)

        const filtered = consoleErrors.filter((line) => !line.includes('Download the React DevTools'))
        expect(filtered, filtered.join('\n')).toEqual([])

        if (screenshotSizes.has(viewport.name)) {
          await page.screenshot({
            path: path.join('e2e', 'screenshots', `${screen.name}-${viewport.name}-${scheme}.png`),
            fullPage: true,
          })
        }

        page.removeAllListeners('console')
        page.removeAllListeners('pageerror')
      }
    })
  }
}
