import { test, expect } from '@playwright/test'
import {
  DRAFT_ID,
  installPublishAudienceMocks,
  lastPublishPatch,
  seedPublishedVariantsForViewer,
  seedSignedInSession,
  READER,
  OTHER,
  fakeAccessToken,
  AUTH_STORAGE_KEY,
} from './publishAudienceMocks.ts'

test.describe.configure({ mode: 'serial' })

const audiences = ['public', 'unlisted', 'private'] as const

for (const audience of audiences) {
  test(`publish poem as ${audience}`, async ({ page }) => {
    await installPublishAudienceMocks(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await seedSignedInSession(page)
    await page.goto(`/create/${DRAFT_ID}`, { waitUntil: 'networkidle' })
    await expect(page.locator('#main')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Publish' }).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('textbox', { name: 'Write your piece' })).toContainText('Draft body', {
      timeout: 30_000,
    })
    await page.getByRole('button', { name: 'Publish' }).first().click()
    await expect(page.getByRole('heading', { name: 'Publish' })).toBeVisible()
    await expect(page.getByText('Draft title')).toBeVisible()
    await page.locator(`input[type="radio"][name="audience"][value="${audience}"]`).check()
    const publishResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/rest/v1/creations') &&
        (response.request().postDataJSON() as { status?: string })?.status === 'published',
    )
    await expect(page.getByText('Add a title before you publish.')).toHaveCount(0)
    await page.getByRole('button', { name: 'Publish' }).last().click()
    await publishResponse

    expect(lastPublishPatch).toMatchObject({ status: 'published', audience })
    await expect(page).toHaveURL(new RegExp(`/c/${DRAFT_ID}$`), { timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Draft title')

    await page.goto(`/u/${READER.username}`, { waitUntil: 'networkidle' })
    if (audience === 'public') {
      await expect(page.getByRole('tabpanel').getByText('Draft title')).toBeVisible()
    } else {
      await expect(page.getByRole('tabpanel').getByText('Draft title')).toHaveCount(0)
    }

    await page.getByRole('tab', { name: 'Drafts' }).click()
    const draftsPanel = page.locator('#panel-drafts')
    if (audience === 'public') {
      await expect(draftsPanel.getByText('Draft title')).toHaveCount(0)
    } else if (audience === 'unlisted') {
      await expect(draftsPanel.getByRole('heading', { name: /^Unlisted/ })).toBeVisible()
      await expect(draftsPanel.getByText('Draft title')).toBeVisible()
    } else {
      await expect(draftsPanel.getByRole('heading', { name: /Journal and private entries/ })).toBeVisible()
      await expect(draftsPanel.getByText('Draft title')).toBeVisible()
    }

    if (audience === 'public') {
      await page.goto('/', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Draft title' })).toBeVisible({ timeout: 15_000 })
    }
  })
}

test('viewer sees only public audience work', async ({ page }) => {
  await installPublishAudienceMocks(page)
  seedPublishedVariantsForViewer()

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    {
      key: AUTH_STORAGE_KEY,
      value: {
        access_token: fakeAccessToken(OTHER.id, 'other@example.com'),
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'voxly-e2e-refresh-token',
        user: {
          id: OTHER.id,
          email: 'other@example.com',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    },
  )

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })
  const feed = page.locator('#main article')
  await expect(feed.getByRole('heading', { name: 'Public poem' })).toBeVisible()
  await expect(feed.getByText('Unlisted poem')).toHaveCount(0)
  await expect(feed.getByText('Private poem')).toHaveCount(0)

  await page.goto(`/u/${READER.username}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('tabpanel').getByText('Public poem')).toBeVisible()
  await expect(page.getByRole('tabpanel').getByText('Unlisted poem')).toHaveCount(0)
  await expect(page.getByRole('tabpanel').getByText('Private poem')).toHaveCount(0)
})
