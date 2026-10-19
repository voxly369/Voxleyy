import type { Page } from '@playwright/test'

export const READER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'reader@example.com',
  username: 'readerone',
  display_name: 'Reader One',
}

export const OTHER = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'writertwo',
  display_name: 'Writer Two',
}

function ownProfile(id: string, username: string, display_name: string) {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id,
    username,
    display_name,
    bio: 'Bio',
    avatar_url: null,
    banner_url: null,
    website: null,
    country: null,
    city: null,
    city_visible: false,
    timezone: 'UTC',
    language: 'en',
    role: 'reader',
    status: 'active',
    suspended_until: null,
    verified: false,
    who_can_message: 'everyone',
    follower_count: 1,
    following_count: 0,
    creation_count: 0,
    created_at: now,
    updated_at: now,
  }
}

export function feedPosts() {
  const longTitle = `Long title ${'word '.repeat(40)}`
  const longWord = `unbroken${'x'.repeat(120)}`
  return Array.from({ length: 10 }, (_, index) => ({
    id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
    type: index === 3 ? 'quote_card' : 'written_post',
    title: index === 1 ? longTitle : `Post ${index + 1}`,
    caption: index === 2 ? longWord : `Caption ${index + 1}`,
    body_excerpt: index === 4 ? `Body ${'paragraph '.repeat(80)}` : `Body ${index + 1}`,
    body_truncated: index === 4,
    cover_url: null,
    audience: 'public',
    published_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    like_count: index,
    comment_count: index % 3,
    save_count: 0,
    author_id: OTHER.id,
    author: {
      id: OTHER.id,
      username: OTHER.username,
      display_name: OTHER.display_name,
      avatar_url: null,
      verified: false,
    },
  }))
}

export async function installSupabaseMocks(page: Page) {
  const posts = feedPosts()

  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (!url.includes('supabase')) {
      await route.continue()
      return
    }

    if (url.includes('/auth/v1/token') || url.includes('/auth/v1/user') || url.includes('/auth/v1/session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-access',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh',
          user: { id: READER.id, email: READER.email, app_metadata: {}, user_metadata: {}, aud: 'authenticated' },
        }),
      })
      return
    }

    if (url.includes('/rest/v1/profiles_public')) {
      const body = url.includes(READER.id)
        ? [ownProfile(READER.id, READER.username, READER.display_name)]
        : [ownProfile(OTHER.id, OTHER.username, OTHER.display_name)]
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
      return
    }

    if (url.includes('/rest/v1/rpc/is_founder')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(false) })
      return
    }

    if (url.includes('/rest/v1/feed_creations') || url.includes('/rest/v1/following_feed')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(posts) })
      return
    }

    if (
      (url.includes('/rest/v1/creations') ||
        url.includes('/rest/v1/likes') ||
        url.includes('/rest/v1/saves') ||
        url.includes('/rest/v1/creation_tags') ||
        url.includes('/rest/v1/follows')) &&
      route.request().method() === 'GET'
    ) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

export async function seedSignedInSession(page: Page) {
  await page.addInitScript(({ userId, email }) => {
    const key = 'sb-ktgxdqplvggeyrnuqljx-auth-token'
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: 'test-access',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: userId, email, app_metadata: {}, user_metadata: {}, aud: 'authenticated' },
      }),
    )
  }, { userId: READER.id, email: READER.email })
}
