import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setModerationIsFounder,
} from './fixtures.ts'
import {
  getAutoHideFeedPostIds,
  resetAutoHideMocks,
  setAutoHideHiddenForViewer,
  setAutoHideQueueRows,
  setAutoHideAuthorNoticePostId,
} from './autoHideMocks.ts'

test.describe('auto-hide moderation', () => {
  test.beforeEach(async ({ page }) => {
    resetAutoHideMocks()
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
  })

  test('hidden post disappears from feed for another user', async ({ page }) => {
    setAutoHideHiddenForViewer(true)
    await page.goto('/', { waitUntil: 'networkidle' })
    expect(getAutoHideFeedPostIds().length).toBeGreaterThan(0)
    await expect(page.getByText('Work 1')).toHaveCount(0)
  })

  test('author sees hidden notice on own post', async ({ page }) => {
    setAutoHideAuthorNoticePostId('00000000-0000-0000-0000-000000000001')
    await page.goto('/c/00000000-0000-0000-0000-000000000001', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('author-auto-hidden-notice')).toBeVisible()
  })

  test('Founder queue lists auto-hidden post and restore', async ({ page }) => {
    setModerationIsFounder(true)
    setAutoHideQueueRows([
      {
        creation_id: '00000000-0000-0000-0000-0000000000h1',
        auto_hidden_at: '2026-01-02T00:00:00.000Z',
        title: 'Flagged post',
        caption: null,
        body_excerpt: 'Hidden excerpt',
        author_id: '22222222-2222-2222-2222-222222222222',
        author_username: 'writertwo',
        author_display_name: 'Writer Two',
        distinct_reporter_count: 3,
        moderation_action_id: '00000000-0000-0000-0000-0000000000mh',
      },
    ])
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Report queue' }).click()
    await expect(page.getByTestId('founder-auto-hide-queue')).toBeVisible()
    await expect(page.getByText('3 distinct reports')).toBeVisible()
    await page.getByRole('button', { name: 'Restore' }).first().click()
    await page.getByLabel('Reason (required)').fill('Restored after review.')
    await page.getByRole('button', { name: 'Restore', exact: true }).click()
  })

  test('appeal opens from author notice', async ({ page }) => {
    setAutoHideAuthorNoticePostId('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000mh')
    await page.goto('/c/00000000-0000-0000-0000-000000000001', { waitUntil: 'networkidle' })
    await page.getByTestId('author-auto-hidden-notice').getByRole('link', { name: 'Appeal' }).click()
    await expect(page).toHaveURL(/\/settings\/appeals/)
    await expect(page.getByLabel('Moderation action ID')).toHaveValue('00000000-0000-0000-0000-0000000000mh')
  })
})
