import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, setModerationIsFounder } from './fixtures.ts'

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

async function assertBellDoesNotCoverBetaControls(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Beta' }).click()
  await expect(page.getByTestId('founder-beta-tab')).toBeVisible()
  const bell = page.getByTestId('notification-bell-mobile')
  await expect(bell).toBeVisible()
  const bellBox = await bell.boundingBox()
  expect(bellBox).not.toBeNull()
  const controls = page.locator(
    '[data-testid="founder-beta-tab"] button, [data-testid="founder-beta-tab"] [role="switch"], [data-testid="founder-beta-tab"] input',
  )
  const count = await controls.count()
  for (let i = 0; i < count; i += 1) {
    const handle = controls.nth(i)
    if (!(await handle.isVisible())) continue
    const box = await handle.boundingBox()
    if (!box) continue
    expect(
      boxesOverlap(bellBox!, box),
      `Bell overlaps control: ${await handle.evaluate((el) => el.getAttribute('data-testid') ?? el.textContent?.trim().slice(0, 40) ?? el.tagName)}`,
    ).toBe(false)
  }
}

for (const { width, height, name } of [
  { width: 375, height: 812, name: '375px' },
  { width: 1280, height: 900, name: '1280px' },
] as const) {
  test(`Founder Beta tab controls clear of mobile bell at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setModerationIsFounder(true)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    if (width < 768) {
      await assertBellDoesNotCoverBetaControls(page)
    } else {
      await page.getByRole('button', { name: 'Beta' }).click()
      await expect(page.getByTestId('founder-beta-flag-beta_invite_only')).toBeVisible()
      await expect(page.getByTestId('notification-bell-mobile')).toBeHidden()
      await expect(page.getByTestId('notification-bell-rail')).toBeVisible()
    }
  })
}
