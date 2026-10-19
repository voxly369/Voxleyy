import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

const deepLinks = [
  '/u/readerone',
  `/c/00000000-0000-0000-0000-000000000001`,
  '/settings',
  '/create/new/poem',
  '/missing-route-for-not-found',
]

test('SPA rewrite serves the app shell for deep links', async ({ page }) => {
  await installSupabaseMocks(page)
  await seedSignedInSession(page)

  for (const path of deepLinks) {
    await page.goto(path, { waitUntil: 'networkidle' })
    await expect(page.locator('#root')).not.toBeEmpty()
    if (path.includes('missing-route')) {
      await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible()
    } else {
      await expect(page.locator('#main, main')).toBeVisible()
    }
  }
})

test('auth redirect paths use window.location.origin', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile('src/lib/auth/AuthProvider.tsx', 'utf8'))
  expect(source).toContain('window.location.origin')
  expect(source).toContain('/auth/callback')
  expect(source).not.toMatch(/localhost:\d+/)
})
