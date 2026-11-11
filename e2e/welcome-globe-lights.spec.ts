import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'
import { setE2eEntranceVisible, setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'

const CORAL = '#FF5A3C'
const GLOBE_LIGHTS_POLL_TIMEOUT_MS = 15_000

async function countGlobeCoralLights(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate((coral) => {
    const svg = document.querySelector('[data-testid="entrance-illustration"]')
    if (!svg) return 0
    if (!svg.querySelector('#ws-globe-clip')) return 0
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
    await expect(page.getByTestId('entrance-illustration')).toBeVisible({ timeout: GLOBE_LIGHTS_POLL_TIMEOUT_MS })

    let polls = 0
    const pollStartedAt = Date.now()
    await expect
      .poll(
        async () => {
          polls += 1
          return countGlobeCoralLights(page)
        },
        {
          timeout: GLOBE_LIGHTS_POLL_TIMEOUT_MS,
          intervals: [100, 200, 300, 500],
          message: 'coral city lights inside #ws-globe-clip after globe stagger reveal',
        },
      )
      .toBeGreaterThanOrEqual(2)
    const waitMs = Date.now() - pollStartedAt

    const count = await countGlobeCoralLights(page)
    expect(count).toBeGreaterThanOrEqual(2)
    expect(waitMs, 'poll settled before timeout').toBeLessThan(GLOBE_LIGHTS_POLL_TIMEOUT_MS)

    test.info().annotations.push({
      type: 'globe-lights-wait',
      description: `${waitMs}ms (${polls} polls)`,
    })

    await page.screenshot({
      path: 'test-results/welcome-globe-lights-2x.png',
      scale: 'device',
    })
  })
})
