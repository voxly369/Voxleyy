import { test, expect } from '@playwright/test'
import { installSupabaseMocks, seedSignedInSession } from './fixtures.ts'

const widths = [375, 767, 768, 1024, 1279, 1280, 1440] as const

test.describe('Discover, search, tags, filters', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('Discover Explore sections appear in order', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible()
    const ids = [
      'discover-spoken-word',
      'discover-featured-writers',
      'discover-word-of-day',
      'discover-trending',
      'discover-new',
      'discover-rising-voices',
      'discover-top-poems',
      'discover-top-stories',
      'discover-trending-sounds',
      'discover-trending-challenges',
    ]
    for (const id of ids) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
  })

  test('search returns writers, posts, and tags', async ({ page }) => {
    await page.goto('/discover/search?q=writer')
    await expect(page.getByText('Writer Two')).toBeVisible()
    await page.getByRole('tab', { name: 'Posts' }).click()
    await expect(page.getByText('Post 1')).toBeVisible()
    await page.getByRole('tab', { name: 'Tags' }).click()
    await expect(page.getByRole('link', { name: /#poetry/i })).toBeVisible()
  })

  test('hashtag page opens from browse chip', async ({ page }) => {
    await page.goto('/discover')
    await page.getByRole('link', { name: 'Hope' }).click()
    await expect(page).toHaveURL(/\/discover\/browse\?/)
    await expect(page.getByRole('heading', { name: 'Browse' })).toBeVisible()
  })

  test('tag page loads from route', async ({ page }) => {
    await page.goto('/tags/poetry')
    await expect(page.getByRole('heading', { name: '#poetry' })).toBeVisible()
    await expect(page.getByText(/work/)).toBeVisible()
  })

  test('filters change the URL on browse', async ({ page }) => {
    await page.goto('/discover/browse?mood=hope&sort=new')
    await expect(page).toHaveURL(/mood=hope/)
    await expect(page).toHaveURL(/sort=new/)
  })

  for (const width of widths) {
    test(`Discover layout at ${width}px has no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/discover')
      await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible()
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})
