import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import { setE2eEntranceVisible, setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { WELCOME_PHASE1_END_MS } from '../src/lib/entrance/welcomeSceneTiming.ts'

const CORAL = '#FF5A3C'
/** Globe reveal + first city-light stagger (index 4 @ +800ms). */
const GLOBE_LIGHT_ASSERT_MS = WELCOME_PHASE1_END_MS + 1_100

async function countGlobeCoralLights(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate((coral) => {
    const svg = document.querySelector('[data-testid="entrance-illustration"]')
    if (!svg) return 0
    let count = 0
    for (const el of svg.querySelectorAll('circle')) {
      if ((el.getAttribute('fill') ?? '').toUpperCase() !== coral) continue
      const opacity = Number.parseFloat(el.getAttribute('opacity') ?? '1')
      if (opacity < 0.2) continue
      if (!el.closest('g[clip-path]')) continue
      count += 1
    }
    return count
  }, CORAL)
}

test.describe('welcome scene globe city lights', () => {
  test.beforeEach(async ({ page }) => {
    setE2eOnboardingComplete()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
    setE2eEntranceVisible(true)
  })

  test('globe shows coral city lights after reveal (production build)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('entrance-screen')).toBeVisible()
    await expect(page.getByTestId('entrance-scene')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(GLOBE_LIGHT_ASSERT_MS)
    const count = await countGlobeCoralLights(page)
    expect(count, `globe coral circles inside clip at ${GLOBE_LIGHT_ASSERT_MS}ms`).toBeGreaterThanOrEqual(2)
    await page.screenshot({
      path: 'test-results/welcome-globe-lights-2x.png',
      scale: 'device',
    })
  })
})
