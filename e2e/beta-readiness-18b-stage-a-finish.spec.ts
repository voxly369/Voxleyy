import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  READER,
} from './fixtures.ts'
import { setE2eConsentsOutdated } from './preBetaMocks.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'

test.describe('beta readiness 18B stage A finish', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eOnboardingComplete()
  })

  test('export download triggers a JSON file', async ({ page }) => {
    await seedSignedInSession(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('settings-download-data').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/voxly-export-.*\.json/)
  })

  test('consent re-accept modal after version bump', async ({ page }) => {
    setE2eConsentsOutdated()
    await seedSignedInSession(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('consent-reaccept-modal')).toBeVisible()
    await page.getByTestId('consent-reaccept-checkbox').check()
    await page.getByTestId('consent-reaccept-submit').click()
    await expect(page.getByTestId('consent-reaccept-modal')).toBeHidden()
  })

  test('rejects wrong file type on avatar upload', async ({ page }) => {
    await seedSignedInSession(page)
    await page.goto('/settings/profile', { waitUntil: 'networkidle' })
    await page.locator('#avatars-upload').setInputFiles({
      name: 'avatar.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    })
    await expect(page.getByText('Use a JPEG, PNG, or WebP image.')).toBeVisible({ timeout: 15_000 })
  })

  test('rejects oversized avatar upload', async ({ page }) => {
    await seedSignedInSession(page)
    await page.goto('/settings/profile', { waitUntil: 'networkidle' })
    await page.locator('#avatars-upload').setInputFiles({
      name: 'huge.webp',
      mimeType: 'image/webp',
      buffer: Buffer.alloc(6 * 1024 * 1024, 1),
    })
    await expect(page.getByText('That image is larger than 5 MB.')).toBeVisible({ timeout: 15_000 })
  })

  test('upload quota RPC rejection on profile edit', async ({ page }) => {
    await seedSignedInSession(page)
    await page.route('**/rest/v1/rpc/check_upload_quota**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Daily upload limit reached. Try again tomorrow.', code: 'P0001' }),
      })
    })
    await page.goto('/settings/profile', { waitUntil: 'networkidle' })
    await expect(page.locator('#avatars-upload')).toBeVisible()
    await page.locator('#avatars-upload').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })
    await expect(page.getByText('Daily upload limit reached')).toBeVisible({ timeout: 15_000 })
  })

  test('rejects wrong file type on manuscript import', async ({ page }) => {
    await seedSignedInSession(page)
    await page.goto(`/u/${READER.username}?tab=books`, { waitUntil: 'networkidle' })
    const importLink = page.getByRole('link', { name: /Import manuscript/i })
    if (await importLink.isVisible()) {
      await importLink.click()
      await page.getByTestId('manuscript-file-input').setInputFiles({
        name: 'bad.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('MZ'),
      })
      await expect(page.getByText(/not supported|too large/i)).toBeVisible()
    }
  })
})
