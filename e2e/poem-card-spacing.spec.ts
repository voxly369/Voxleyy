import { test, expect } from '@playwright/test'
import {
  installSupabaseMocks,
  seedSignedInSession,
  SAMPLE_CREATION_ID,
  setE2eCreationDetailOverride,
  setE2eFeedOverride,
  OTHER,
} from './fixtures.ts'

const PROSE_POEM_EXCERPT = [
  'Its is a stubborn thing. It sits in the chest like a stone.',
  'It will not move for pleading, will not soften for time.',
  '',
  'Second paragraph opens with rain on glass.',
].join('\n\n')

const poemFeedRow = {
  id: SAMPLE_CREATION_ID,
  type: 'poem',
  title: 'Stubborn',
  caption: null,
  body_excerpt: PROSE_POEM_EXCERPT,
  body_truncated: false,
  cover_url: null,
  audience: 'public',
  published_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  like_count: 1,
  comment_count: 0,
  save_count: 0,
  author_id: OTHER.id,
  author: {
    id: OTHER.id,
    username: OTHER.username,
    display_name: OTHER.display_name,
    avatar_url: null,
    verified: false,
  },
}

const poemCreationDetail = {
  id: SAMPLE_CREATION_ID,
  type: 'poem',
  title: 'Stubborn',
  caption: null,
  body_text: PROSE_POEM_EXCERPT,
  body_json: null,
  cover_url: null,
  status: 'published',
  audience: 'public',
  author_id: OTHER.id,
  genre: null,
  mood: null,
  language: 'en',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: OTHER.id,
    username: OTHER.username,
    display_name: OTHER.display_name,
    avatar_url: null,
    verified: false,
  },
}

test.describe('Poem card spacing', () => {
  test.beforeEach(async ({ page }) => {
    setE2eFeedOverride([poemFeedRow])
    setE2eCreationDetailOverride(poemCreationDetail)
    await seedSignedInSession(page)
    await installSupabaseMocks(page)
  })

  test.afterEach(() => {
    setE2eFeedOverride(null)
    setE2eCreationDetailOverride(null)
  })

  test('card stanza gap is not larger than post page stanza gap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByText(/stubborn thing/i)).toBeVisible()
    const cardStanza = page.locator('article').first().locator('.flex.flex-col.gap-0').first()
    await expect(cardStanza).toBeVisible()
    const cardGapBox = await cardStanza.evaluate((el) => {
      const parent = el.parentElement
      if (!parent) return 0
      const style = window.getComputedStyle(parent)
      return parseFloat(style.gap || style.rowGap || '0')
    })

    await page.goto(`/c/${SAMPLE_CREATION_ID}`)
    await expect(page.getByText(/stubborn thing/i)).toBeVisible()
    const postStanza = page.locator('.flex.flex-col.gap-0').first()
    await expect(postStanza).toBeVisible()
    const postGapBox = await postStanza.evaluate((el) => {
      const parent = el.parentElement
      if (!parent) return 0
      const style = window.getComputedStyle(parent)
      return parseFloat(style.gap || style.rowGap || '0')
    })

    expect(cardGapBox).toBeLessThanOrEqual(postGapBox + 1)
  })
})
