import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  resetBookBuilderMocks,
  seedBookEntitlement,
} from './fixtures.ts'
import { E2E_FREE_BOOK_ID, E2E_PAID_BOOK_ID, seedRentalEntitlement } from './bookBuilderMocks.ts'

test.describe('Book library flow', () => {
  test.beforeEach(async ({ page }) => {
    resetBookBuilderMocks()
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test('books shelf shows filter chips', async ({ page }) => {
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await page.goto('/library?tab=books')
    await expect(page.getByTestId('library-books-shelf')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible()
  })

  test('renders rental days-left label from entitlement', async ({ page }) => {
    seedRentalEntitlement({ bookId: E2E_PAID_BOOK_ID, daysLeft: 5 })
    await page.goto('/library?tab=books')
    await expect(page.getByText(/5 rental days left/i)).toBeVisible()
  })

  test('shows empty state for Reading filter when no in-progress books', async ({ page }) => {
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await page.goto('/library?tab=books')
    await page.getByTestId('library-books-shelf').getByRole('tab', { name: 'Reading' }).click()
    await expect(page.getByText('No books match this filter.')).toBeVisible()
  })

  test('shows empty state for Rented filter without rentals', async ({ page }) => {
    seedBookEntitlement({ bookId: E2E_FREE_BOOK_ID, kind: 'free' })
    await page.goto('/library?tab=books')
    await page.getByTestId('library-books-shelf').getByRole('tab', { name: 'Rented' }).click()
    await expect(page.getByText('No books match this filter.')).toBeVisible()
  })
})
