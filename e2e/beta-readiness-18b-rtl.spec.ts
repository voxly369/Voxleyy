import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  setE2eCreationDetailOverride,
  SAMPLE_CREATION_ID,
} from './fixtures.ts'
import { setE2eOnboardingComplete } from './betaReadiness18bMocks.ts'
import { setE2eConsentsCurrent } from './preBetaMocks.ts'

const author = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'writertwo',
  display_name: 'Writer Two',
  avatar_url: null,
  verified: false,
}

test.describe('beta readiness 18B RTL language rendering', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMocks(page)
    setE2eOnboardingComplete()
    setE2eConsentsCurrent()
    await seedSignedInSession(page)
  })

  test.afterEach(() => {
    setE2eCreationDetailOverride(null)
  })

  test('Arabic post exposes rtl lang on title body and comment', async ({ page }) => {
    setE2eCreationDetailOverride({
      id: SAMPLE_CREATION_ID,
      type: 'written_post',
      title: 'مرحبا',
      caption: null,
      body_text: 'هذا نص عربي للاختبار.',
      body_json: {
        version: 1,
        format: 'rich',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'هذا نص عربي للاختبار.' }] }],
      },
      language: 'ar',
      status: 'published',
      audience: 'public',
      is_removed: false,
      removed_reason: null,
      cover_url: null,
      genre: null,
      mood: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      author_id: author.id,
      author: {
        id: author.id,
        username: author.username,
        display_name: author.display_name,
        avatar_url: null,
        verified: false,
      },
    })
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'domcontentloaded' })
    const title = page.getByTestId('creation-title')
    await expect(title).toHaveAttribute('lang', 'ar')
    await expect(title).toHaveAttribute('dir', 'rtl')
    const body = page.getByTestId('creation-body')
    await expect(body).toHaveAttribute('lang', 'ar')
    await expect(body).toHaveAttribute('dir', 'rtl')
    await page.getByRole('button', { name: 'Comments' }).click()
    const comment = page.getByTestId('comment-body').first()
    await expect(comment).toHaveAttribute('lang', 'ar')
    await expect(comment).toHaveAttribute('dir', 'rtl')
  })

  test('Hebrew post exposes rtl lang on title and body', async ({ page }) => {
    setE2eCreationDetailOverride({
      id: SAMPLE_CREATION_ID,
      type: 'written_post',
      title: 'שלום',
      caption: null,
      body_text: 'זהו טקסט בעברית.',
      body_json: {
        version: 1,
        format: 'rich',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'זהו טקסט בעברית.' }] }],
      },
      language: 'he',
      status: 'published',
      audience: 'public',
      is_removed: false,
      removed_reason: null,
      cover_url: null,
      genre: null,
      mood: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      author_id: author.id,
      author: {
        id: author.id,
        username: author.username,
        display_name: author.display_name,
        avatar_url: null,
        verified: false,
      },
    })
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('creation-title')).toHaveAttribute('lang', 'he')
    await expect(page.getByTestId('creation-title')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByTestId('creation-body')).toHaveAttribute('lang', 'he')
    await expect(page.getByTestId('creation-body')).toHaveAttribute('dir', 'rtl')
  })

  test('mixed Arabic and English post uses lang with dir auto', async ({ page }) => {
    setE2eCreationDetailOverride({
      id: SAMPLE_CREATION_ID,
      type: 'written_post',
      title: 'Mixed مرحبا hello',
      caption: null,
      body_text: 'English start مرحبا end.',
      body_json: {
        version: 1,
        format: 'rich',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'English start مرحبا end.' }] }],
      },
      language: 'en',
      status: 'published',
      audience: 'public',
      is_removed: false,
      removed_reason: null,
      cover_url: null,
      genre: null,
      mood: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      author_id: author.id,
      author: {
        id: author.id,
        username: author.username,
        display_name: author.display_name,
        avatar_url: null,
        verified: false,
      },
    })
    await page.goto(`/c/${SAMPLE_CREATION_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('creation-body')).toHaveAttribute('lang', 'en')
    await expect(page.getByTestId('creation-body')).toHaveAttribute('dir', 'auto')
  })
})
