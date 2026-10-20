import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession, READER, OTHER } from './fixtures.ts'

test.describe('mobile settings entry', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('own profile opens Settings from the header menu at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/u/${READER.username}`, { waitUntil: 'networkidle' })
    await page.getByTestId('profile-settings-button').click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
  })

  test('bottom bar has exactly five destinations at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/', { waitUntil: 'networkidle' })
    const bottom = page.getByTestId('bottom-nav')
    await expect(bottom).toBeVisible()
    await expect(bottom.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(bottom.getByRole('link', { name: 'Discover' })).toBeVisible()
    await expect(bottom.getByRole('button', { name: 'Create' })).toBeVisible()
    await expect(bottom.getByRole('link', { name: 'Messages' })).toBeVisible()
    await expect(bottom.getByRole('link', { name: 'Profile' })).toBeVisible()
    await expect(bottom.getByRole('link')).toHaveCount(4)
    await expect(bottom.getByRole('button')).toHaveCount(1)
  })

  test('settings button is hidden on other profiles and from 768px up', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('profile-settings-button')).toHaveCount(0)

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`/u/${READER.username}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('profile-settings-button')).toBeHidden()
  })
})
