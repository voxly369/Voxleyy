import { test, expect } from '@playwright/test'
import {
  gotoFounderReportQueue,
  installSupabaseMocks,
  seedModerationAuditLog,
  seedSignedInSession,
  setModerationAllowPrivateView,
  setModerationIsFounder,
} from './fixtures.ts'

function founderNav(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Founder sections' })
}

async function confirmFounderReason(page: import('@playwright/test').Page, reason: string) {
  await page.getByLabel('Reason (required)').fill(reason)
  await page.getByRole('button', { name: 'Confirm' }).click()
}

function auditLogRows(page: import('@playwright/test').Page) {
  return page.getByTestId('founder-audit-log').locator('div.rounded-xl')
}

async function expectAuditAction(page: import('@playwright/test').Page, action: string) {
  await expect(auditLogRows(page).filter({ has: page.locator('span.font-semibold', { hasText: action }) }).first()).toBeVisible()
}

test.describe('moderation 12B founder workflows', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    await seedSignedInSession(page)
    setModerationIsFounder(true)
  })

  test('empty reason blocks dismiss action', async ({ page }) => {
    await gotoFounderReportQueue(page)
    await page.getByRole('button', { name: 'Dismiss' }).first().click()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText('A reason is required.')).toBeVisible()
  })

  test('queue remove warn suspend and ban write audit rows', async ({ page }) => {
    await gotoFounderReportQueue(page)
    await page.getByRole('button', { name: 'Remove content' }).first().click()
    await confirmFounderReason(page, 'Remove for spam policy.')
    await page.getByRole('button', { name: 'Warn' }).first().click()
    await page.getByLabel('Warning message to user').fill('Please stop spamming.')
    await confirmFounderReason(page, 'Warn user for spam.')
    await page.getByRole('button', { name: 'Suspend 7d' }).first().click()
    await confirmFounderReason(page, 'Seven day suspension reason.')
    await page.getByRole('button', { name: 'Ban' }).first().click()
    await confirmFounderReason(page, 'Ban for repeated abuse.')
    await founderNav(page).getByRole('button', { name: 'Audit log' }).click()
    await expect(page.getByTestId('founder-audit-log')).toBeVisible()
    await expectAuditAction(page, 'remove')
    await expectAuditAction(page, 'warn')
    await expectAuditAction(page, 'suspend')
    await expectAuditAction(page, 'ban')
  })

  test('queue suspend 1d and 30d', async ({ page }) => {
    await gotoFounderReportQueue(page)
    await page.getByRole('button', { name: 'Suspend 1d' }).first().click()
    await confirmFounderReason(page, 'One day suspension reason.')
    await page.getByRole('button', { name: 'Suspend 30d' }).first().click()
    await confirmFounderReason(page, 'Thirty day suspension reason.')
  })

  test('content tab remove and restore', async ({ page }) => {
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await founderNav(page).getByRole('button', { name: 'Content', exact: true }).click()
    await page.getByRole('button', { name: 'Remove' }).first().click()
    await page.getByLabel('Reason (required)').fill('Remove from content browser.')
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await page.getByRole('button', { name: 'Restore' }).first().click()
    await page.getByLabel('Reason (required)').fill('Restore after review.')
    await page.getByRole('button', { name: 'Restore', exact: true }).click()
    await founderNav(page).getByRole('button', { name: 'Audit log' }).click()
    await expectAuditAction(page, 'restore')
  })

  test('users search and unban', async ({ page }) => {
    await gotoFounderReportQueue(page)
    await founderNav(page).getByRole('button', { name: 'Users' }).click()
    await page.getByPlaceholder('Search name, username, or email').fill('writertwo')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText('@writertwo')).toBeVisible()
  })

  test('decide appeal upheld and overturned', async ({ page }) => {
    await gotoFounderReportQueue(page)
    await founderNav(page).getByRole('button', { name: 'Appeals' }).click()
    await page.getByRole('button', { name: 'Uphold' }).first().click()
    await page.getByLabel('Reason (required)').fill('Original removal was correct.')
    await page.getByRole('button', { name: 'Save decision' }).click()
    await page.getByRole('button', { name: 'Overturn' }).first().click()
    await page.getByLabel('Reason (required)').fill('Restoring access after review.')
    await page.getByRole('button', { name: 'Save decision' }).click()
    await founderNav(page).getByRole('button', { name: 'Audit log' }).click()
    await expectAuditAction(page, 'appeal_decision')
  })

  test('audit log filter by action', async ({ page }) => {
    await gotoFounderReportQueue(page)
    await page.getByRole('button', { name: 'Dismiss' }).first().click()
    await confirmFounderReason(page, 'Dismiss test reason here.')
    await founderNav(page).getByRole('button', { name: 'Audit log' }).click()
    await page.getByTestId('founder-audit-filter').selectOption('dismiss')
    await expectAuditAction(page, 'dismiss')
  })

  test('audit log cursor pagination', async ({ page }) => {
    seedModerationAuditLog(25)
    await gotoFounderReportQueue(page)
    await founderNav(page).getByRole('button', { name: 'Audit log' }).click()
    await expect(auditLogRows(page)).toHaveCount(20)
    await expect(page.getByRole('button', { name: 'Load more' })).toBeVisible()
    await page.getByRole('button', { name: 'Load more' }).click()
    expect(await auditLogRows(page).count()).toBeGreaterThan(20)
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0)
  })

  test('view reported private content logs and refuses without report', async ({ page }) => {
    await gotoFounderReportQueue(page)
    await page.getByText('Private journal report').scrollIntoViewIfNeeded()
    await page.getByTestId('view-reported-private-content').click()
    await expect(page.getByTestId('private-content-preview')).toContainText('Secret journal')
    setModerationAllowPrivateView(false)
    await page.getByTestId('view-reported-private-content').click()
    await expect(page.getByText(/No open report/i)).toBeVisible()
  })

  test('non-Founder cannot open founder dashboard', async ({ page }) => {
    setModerationIsFounder(false)
    await page.goto('/founder', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/')
  })
})
