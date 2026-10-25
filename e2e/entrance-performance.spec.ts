import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  installSupabaseMocks,
  seedSignedInSession,
} from './fixtures.ts'
import {
  setE2eEntranceVisible,
  setE2eOnboardingComplete,
} from './betaReadiness18bMocks.ts'
import {
  SCENE_ELEMENT_CAP_PHONE,
  SCENE_ELEMENT_CAP_WIDE,
} from '../src/lib/entrance/sceneElements.ts'
import {
  countMovingEntranceElements,
  dismissEntrance,
  sampleFrameTimes,
} from './entrancePerformanceHelpers.ts'

const JANK_AVG_FRAME_MS = 33

test.describe('19A entrance performance', () => {
  test.beforeEach(async ({ page }) => {
    setE2eOnboardingComplete()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    setE2eEntranceVisible(true)
  })

  for (const { width, cap, label } of [
    { width: 375, cap: SCENE_ELEMENT_CAP_PHONE, label: '375' },
    { width: 1280, cap: SCENE_ELEMENT_CAP_WIDE, label: '1280' },
  ] as const) {
    test(`animated element count within cap at ${label}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('entrance-scene')).toBeVisible()
      const floatCount = await page.locator('[data-testid="entrance-scene"] .entrance-float').count()
      expect(floatCount).toBeLessThanOrEqual(cap)
      const moving = await countMovingEntranceElements(page)
      expect(moving).toBeLessThanOrEqual(cap)
    })
  }

  test('no scene motion when tab is hidden', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-scene')).toBeVisible()
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get() {
          return 'hidden'
        },
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const moving = await countMovingEntranceElements(page)
    expect(moving).toBe(0)
  })

  test('no scene motion when prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-scene')).toBeVisible()
    const moving = await countMovingEntranceElements(page)
    expect(moving).toBe(0)
  })

  for (const { width, label } of [
    { width: 375, label: '375' },
    { width: 1280, label: '1280' },
  ] as const) {
    test(`performance trace entrance ${label}px`, async ({ page, context }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      const traceDir = testInfo.outputDir
      fs.mkdirSync(traceDir, { recursive: true })
      const tracePath = path.join(traceDir, `entrance-trace-${label}.zip`)
      await context.tracing.start({ screenshots: true, snapshots: true, title: `entrance-${label}` })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('entrance-screen')).toBeVisible()
      const samplePromise = sampleFrameTimes(page, 2200)
      await dismissEntrance(page, width)
      await expect(page.getByTestId('entrance-screen')).toHaveCount(0, { timeout: 15_000 })
      const metrics = await samplePromise
      await context.tracing.stop({ path: tracePath })
      testInfo.annotations.push(
        { type: 'trace', description: tracePath },
        {
          type: 'frame-metrics',
          description: `avg=${metrics.averageMs.toFixed(2)}ms worst=${metrics.worstMs.toFixed(2)}ms samples=${metrics.samples.length}`,
        },
      )
      console.log(
        `[entrance ${label}px] trace=${tracePath} avgFrame=${metrics.averageMs.toFixed(2)}ms worstFrame=${metrics.worstMs.toFixed(2)}ms`,
      )
    })
  }

  test('entrance animation average frame time stays within jank budget', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const traceDir = testInfo.outputDir
    fs.mkdirSync(traceDir, { recursive: true })
    const tracePath = path.join(traceDir, 'entrance-jank-375.zip')
    await context.tracing.start({ screenshots: true, snapshots: true, title: 'entrance-jank' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    const samplePromise = sampleFrameTimes(page, 2500)
    await dismissEntrance(page, 375)
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0, { timeout: 15_000 })
    const metrics = await samplePromise
    await context.tracing.stop({ path: tracePath })
    testInfo.annotations.push({ type: 'trace', description: tracePath })
    console.log(
      `[entrance jank] trace=${tracePath} avgFrame=${metrics.averageMs.toFixed(2)}ms samples=${metrics.samples.length}`,
    )
    expect(metrics.samples.length, 'expected frame samples during entrance').toBeGreaterThan(30)
    expect(
      metrics.averageMs,
      `average frame time ${metrics.averageMs.toFixed(2)}ms exceeds ${JANK_AVG_FRAME_MS}ms; trace: ${tracePath}`,
    ).toBeLessThanOrEqual(JANK_AVG_FRAME_MS)
  })
})
