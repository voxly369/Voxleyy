import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eOwnProfileVerified,
  setE2eOtherAuthorVerified,
  setE2eFeedOverride,
  setE2eCreationDetailOverride,
  SAMPLE_CREATION_ID,
  OTHER,
  READER,
  feedPosts,
} from './fixtures.ts'

const LAYOUT_WIDTHS = [375, 767, 768, 1024, 1279, 1280, 1440] as const

test.describe('18C hardening verified seal and layout', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('verified seal on feed post', async ({ page }) => {
    setE2eOtherAuthorVerified(true)
    await page.goto('/home', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabelText('Verified account').first()).toBeVisible()
  })

  test('verified seal on comment', async ({ page }) => {
    setE2eOtherAuthorVerified(true)
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /comments/i }).first().click()
    await expect(page.getByLabelText('Verified account').first()).toBeVisible()
  })

  test('verified seal on search writer result', async ({ page }) => {
    await page.route('**/rest/v1/rpc/search_discovery**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          writers: [
            {
              id: OTHER.id,
              username: OTHER.username,
              display_name: OTHER.display_name,
              avatar_url: null,
              verified: true,
              follower_count: 2,
              country: null,
            },
          ],
          posts: [],
          tags: [],
        }),
      })
    })
    await page.goto('/discover/search?q=writ', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabelText('Verified account').first()).toBeVisible()
  })

  test('verified seal on message thread header', async ({ page }) => {
    await page.route('**/rest/v1/rpc/list_my_conversations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            conversation_id: '00000000-0000-0000-0000-000000000099',
            last_activity_at: new Date().toISOString(),
            muted: false,
            other_user_id: OTHER.id,
            other_username: OTHER.username,
            other_display_name: OTHER.display_name,
            other_avatar_url: null,
            other_verified: true,
            other_country: null,
            other_show_local_time: false,
            other_timezone: 'UTC',
            other_account_deleted: false,
            unread_count: 0,
            preview: 'Hi',
          },
        ]),
      })
    })
    await page.goto('/messages/00000000-0000-0000-0000-000000000099', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('thread-header-name').getByLabelText('Verified account')).toBeVisible()
  })

  test('verified seal on reader byline', async ({ page }) => {
    setE2eOtherAuthorVerified(true)
    const detail = {
      id: SAMPLE_CREATION_ID,
      type: 'written_post',
      title: 'Read me',
      body_text: 'Paragraph one.\n\nParagraph two.',
      body_json: null,
      author: {
        id: OTHER.id,
        username: OTHER.username,
        display_name: OTHER.display_name,
        avatar_url: null,
        verified: true,
      },
    }
    setE2eCreationDetailOverride(detail)
    await page.goto(`/read/${SAMPLE_CREATION_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('reader-author-byline').getByLabelText('Verified account')).toBeVisible()
  })

  test('long display name keeps seal visible at layout widths', async ({ page }) => {
    setE2eOtherAuthorVerified(true)
    const longName = 'A'.repeat(64)
    const posts = feedPosts().map((p, i) =>
      i === 0
        ? {
            ...p,
            author: { ...p.author, display_name: longName, verified: true },
          }
        : p,
    )
    setE2eFeedOverride(posts)
    for (const width of LAYOUT_WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/home', { waitUntil: 'domcontentloaded' })
      const seal = page.getByLabelText('Verified account').first()
      await expect(seal).toBeVisible()
      const box = await seal.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    }
  })

  test('axe on feed card with seal at 375 and 1280', async ({ page }) => {
    setE2eOtherAuthorVerified(true)
    for (const width of [375, 1280] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/home', { waitUntil: 'domcontentloaded' })
      const results = await new AxeBuilder({ page }).include('article').analyze()
      expect(results.violations).toEqual([])
    }
  })
})

test.describe('18C hardening about profile', () => {
  test.beforeEach(async ({ page }) => {
    setE2eOwnProfileVerified(true)
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('opens from overflow menu and Escape returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/u/${OTHER.username}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Safety options' }).click()
    const trigger = page.getByTestId('profile-about-menu-item')
    await trigger.click()
    await expect(page.getByTestId('about-profile-sheet')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('about-profile-sheet')).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  for (const width of LAYOUT_WIDTHS) {
    test(`about sheet layout ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
      await page.getByTestId('profile-verified-seal-button').click()
      await expect(page.getByTestId('about-profile-sheet')).toBeVisible()
    })
  }

  test('axe on about sheet at 375 and 1280', async ({ page }) => {
    for (const width of [375, 1280] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
      await page.getByTestId('profile-verified-seal-button').click()
      const results = await new AxeBuilder({ page }).include('[data-testid="about-profile-sheet"]').analyze()
      expect(results.violations).toEqual([])
    }
  })
})

test.describe('18C hardening profile photos', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('rejects wrong type and oversized avatar', async ({ page }) => {
    await page.goto('/settings/profile', { waitUntil: 'domcontentloaded' })
    await page.locator('#avatars-gallery').setInputFiles({
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    })
    await expect(page.getByRole('alert')).toContainText(/not supported|readable/i)
    await page.locator('#avatars-gallery').setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(11 * 1024 * 1024, 1),
    })
    await expect(page.getByText(/too large/i)).toBeVisible()
  })

  test('remove avatar and banner', async ({ page }) => {
    await page.goto('/settings/profile', { waitUntil: 'domcontentloaded' })
    const removeButtons = page.getByRole('button', { name: 'Remove' })
    const count = await removeButtons.count()
    for (let i = 0; i < count; i += 1) {
      if (await removeButtons.nth(i).isVisible()) await removeButtons.nth(i).click()
    }
  })
})

test.describe('18C hardening badges and bell', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('see all badges lists locked progress', async ({ page }) => {
    await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: /See all badges/i }).click()
    await expect(page.getByTestId('profile-badges-page')).toBeVisible()
    await expect(page.getByText(/heart behind Voxly/i)).toBeVisible()
    await expect(page.getByText(/\d+\s*\/\s*\d+/).first()).toBeVisible()
  })

  for (const width of LAYOUT_WIDTHS) {
    test(`notification bell right and no overlap ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/u/${READER.username}`, { waitUntil: 'domcontentloaded' })
      const bell =
        width < 768
          ? page.getByTestId('notification-bell-mobile')
          : page.getByTestId('notification-bell-rail')
      if (await bell.isVisible()) {
        const box = await bell.boundingBox()
        expect(box).not.toBeNull()
        if (width < 768) expect(box!.x + box!.width / 2).toBeGreaterThan(width / 2)
        const settings = page.getByTestId('profile-settings-button')
        if (await settings.isVisible()) {
          const sbox = await settings.boundingBox()
          expect(sbox).not.toBeNull()
          expect(sbox!.x + sbox!.width <= box!.x || box!.x + box!.width <= sbox!.x).toBeTruthy()
        }
      }
    })
  }
})
