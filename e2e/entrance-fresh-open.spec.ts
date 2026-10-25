import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import {
  setE2eEntranceVisible,
  setE2eOnboardingComplete,
} from './betaReadiness18bMocks.ts'
import { LAST_ENTRANCE_DISMISSED_AT_KEY } from '../src/lib/entrance/entranceSchedule.ts'

const FORTY_MINUTES_MS = 40 * 60 * 1000

test.describe('18C entrance fresh-open rule', () => {
  test.beforeEach(async ({ page }) => {
    setE2eOnboardingComplete()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('entrance fresh load shows the entrance overlay', async ({ page }) => {
    setE2eEntranceVisible(true)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
  })

  test('entrance in-app route change does not show the overlay again', async ({ page }) => {
    setE2eEntranceVisible(true)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await page.getByTestId('entrance-enter-button').click()
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
    await page.goto('/discover', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
  })

  test('entrance reload after 40 minutes shows the overlay again', async ({ page }) => {
    setE2eEntranceVisible(true)
    await page.addInitScript(
      ({ key, gapMs }) => {
        localStorage.setItem(key, String(Date.now() - gapMs))
      },
      { key: LAST_ENTRANCE_DISMISSED_AT_KEY, gapMs: FORTY_MINUTES_MS },
    )
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
  })

  test('entrance Show the entrance screen off hides the overlay', async ({ page }) => {
    setE2eEntranceVisible(false)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toHaveCount(0)
  })
})
