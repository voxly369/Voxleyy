import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
} from './fixtures.ts'
import {
  setE2eEntranceVisible,
  setE2eOnboardingComplete,
} from './betaReadiness18bMocks.ts'

test.describe('19A entrance swipe and music', () => {
  test.beforeEach(async ({ page }) => {
    setE2eOnboardingComplete()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    setE2eEntranceVisible(true)
  })

  test('Enter button dismisses on desktop', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await page.getByTestId('entrance-enter-button').click()
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
    await expect(page.locator('#main')).toBeFocused()
  })

  test('keyboard ArrowRight enters Home', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
  })

  test('swipe gesture completes on touch viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    const panel = page.getByTestId('entrance-screen')
    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    const startX = box!.x + 40
    const startY = box!.y + box!.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 280, startY, { steps: 12 })
    await page.mouse.up()
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0, { timeout: 10_000 })
  })

  test('short swipe springs back', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    const panel = page.getByTestId('entrance-screen')
    const box = await panel.boundingBox()
    const startX = box!.x + 40
    const startY = box!.y + box!.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 30, startY, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
  })

  test('music controls with stubbed track', async ({ page }) => {
    await page.addInitScript(() => {
      window.__VOXLY_E2E_ENTRANCE_MUSIC__ = {
        src: '/audio/e2e-stub.ogg',
        credit: 'E2E Stub',
        licence: 'Test licence',
      }
      class StubAudio {
        loop = false
        volume = 1
        paused = true
        play() {
          this.paused = false
          return Promise.resolve()
        }
        pause() {
          this.paused = true
        }
      }
      // @ts-expect-error test stub
      window.Audio = StubAudio
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-music-mute')).toBeVisible()
    await page.getByTestId('entrance-music-mute').click()
    await expect(page.getByTestId('entrance-music-mute')).toHaveAttribute('aria-pressed', 'true')
  })

  test('settings entrance music toggle when track configured', async ({ page }) => {
    await page.addInitScript(() => {
      window.__VOXLY_E2E_ENTRANCE_MUSIC__ = {
        src: '/audio/e2e-stub.ogg',
        credit: 'E2E',
        licence: 'Test',
      }
    })
    setE2eEntranceVisible(false)
    await page.goto('/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-entrance-music')).toBeVisible()
  })

  test('controls hidden when no track', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await expect(page.getByTestId('entrance-music-mute')).toHaveCount(0)
  })

  test('audio does not play after leaving entrance', async ({ page }) => {
    await page.addInitScript(() => {
      let instances = 0
      window.__VOXLY_E2E_ENTRANCE_MUSIC__ = {
        src: '/audio/e2e-stub.ogg',
        credit: 'E2E',
        licence: 'Test',
      }
      class StubAudio {
        static last: StubAudio | null = null
        loop = false
        volume = 1
        paused = true
        constructor() {
          instances += 1
          StubAudio.last = this
        }
        play() {
          this.paused = false
          return Promise.resolve()
        }
        pause() {
          this.paused = true
        }
      }
      // @ts-expect-error stub
      window.Audio = StubAudio
      // @ts-expect-error stub
      window.__VOXLY_AUDIO_COUNT__ = () => instances
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('entrance-enter-button').click()
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
    const paused = await page.evaluate(() => {
      const C = window.Audio as unknown as { last?: { paused: boolean } }
      return C.last?.paused ?? true
    })
    expect(paused).toBe(true)
  })

  for (const width of [375, 1280] as const) {
    test(`axe entrance ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('entrance-screen')).toBeVisible()
      const results = await new AxeBuilder({ page }).include('[data-testid="entrance-screen"]').analyze()
      expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
    })
  }
})

test.describe('19A entrance layout widths', () => {
  test.beforeEach(async ({ page }) => {
    setE2eOnboardingComplete()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    setE2eEntranceVisible(true)
  })

  for (const width of [375, 767, 768, 1024, 1279, 1280, 1440] as const) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('entrance-screen')).toBeVisible()
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})
