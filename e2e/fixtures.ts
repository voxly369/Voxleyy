import type { Page, Route } from '@playwright/test'
import { audienceMockHandleRest } from './publishAudienceState.ts'
import {
  libraryReadingMockHandleRest,
  resetLibraryReadingMocks,
  seedLibrarySave,
  seedReadingProgress,
} from './libraryReadingMocks.ts'
import { Buffer } from 'node:buffer'

export const PROJECT_REF = 'ktgxdqplvggeyrnuqljx'
export const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`

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

const SAMPLE_CREATION_ID = '00000000-0000-0000-0000-000000000001'
const DRAFT_ID = '00000000-0000-0000-0000-0000000000d1'

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/** Unsigned JWT-shaped token (supabase-js accepts structure + future exp). */
export function fakeAccessToken(userId: string, email: string): string {
  const exp = Math.floor(Date.now() / 1000) + 86_400
  const header = base64url({ alg: 'HS256', typ: 'JWT' })
  const payload = base64url({
    sub: userId,
    email,
    role: 'authenticated',
    aud: 'authenticated',
    exp,
    iat: Math.floor(Date.now() / 1000),
  })
  const signature = Buffer.from('voxly-e2e-test-signature').toString('base64url')
  return `${header}.${payload}.${signature}`
}

function sessionResponse(userId: string, email: string) {
  const access_token = fakeAccessToken(userId, email)
  const expires_at = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at,
    refresh_token: 'voxly-e2e-refresh-token',
    user: {
      id: userId,
      email,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  }
}

function ownProfile(id: string, username: string, display_name: string, creation_count = 0) {
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
    role: 'writer',
    status: 'active',
    suspended_until: null,
    verified: false,
    who_can_message: 'everyone',
    follower_count: 12,
    following_count: 2,
    creation_count,
    created_at: now,
    updated_at: now,
  }
}

export type E2eFeedRow = ReturnType<typeof feedPosts>[number]

let e2eFeedOverride: E2eFeedRow[] | null = null
let e2eCreationDetailOverride: Record<string, unknown> | null = null

/** Replace default feed rows for a single e2e file; pass null to reset. */
export function setE2eFeedOverride(posts: E2eFeedRow[] | null) {
  e2eFeedOverride = posts
}

/** Replace GET /creations?id=eq.SAMPLE_CREATION_ID payload; pass null to reset. */
export function setE2eCreationDetailOverride(detail: Record<string, unknown> | null) {
  e2eCreationDetailOverride = detail
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
    comment_count: index % 3 === 0 ? 2 : 0,
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

function authorEmbed(id: string, username: string, display_name: string) {
  return {
    id,
    username,
    display_name,
    avatar_url: null,
    verified: false,
  }
}

function creationDetail(id: string) {
  return {
    id,
    type: 'written_post',
    title: 'Readable creation',
    caption: 'Caption',
    body_text: 'Long reading sample '.repeat(20),
    body_json: {
      version: 1,
      format: 'rich',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Long reading sample '.repeat(20) }] }],
    },
    cover_url: null,
    status: 'published',
    audience: 'public',
    author_id: OTHER.id,
    genre: null,
    mood: null,
    language: 'en',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    author: authorEmbed(OTHER.id, OTHER.username, OTHER.display_name),
  }
}

function publishedWorksForAuthor(authorId: string, username: string, display_name: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-0000-0000-${String(100 + index).padStart(12, '0')}`,
    type: 'written_post',
    title: `Work ${index + 1}`,
    caption: null,
    cover_url: null,
    audience: 'public',
    status: 'published',
    published_at: new Date(Date.UTC(2026, 1, index + 1)).toISOString(),
    created_at: new Date(Date.UTC(2026, 1, index + 1)).toISOString(),
    like_count: 0,
    comment_count: 0,
    body_text: 'Excerpt',
    body_json: null,
    author_id: authorId,
    author: authorEmbed(authorId, username, display_name),
  }))
}

function draftRows() {
  return [
    {
      id: DRAFT_ID,
      type: 'poem',
      title: 'Draft poem',
      status: 'draft',
      audience: 'private',
      updated_at: '2026-02-01T00:00:00Z',
      is_removed: false,
    },
    {
      id: '00000000-0000-0000-0000-0000000000d2',
      type: 'written_post',
      title: 'Second draft',
      status: 'draft',
      audience: 'private',
      updated_at: '2026-01-15T00:00:00Z',
      is_removed: false,
    },
  ]
}

function commentTree() {
  return [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      creation_id: SAMPLE_CREATION_ID,
      author_id: OTHER.id,
      parent_id: null,
      body: 'Top comment @readerone',
      is_removed: false,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      author: {
        id: OTHER.id,
        username: OTHER.username,
        display_name: OTHER.display_name,
        avatar_url: null,
        verified: false,
      },
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      creation_id: SAMPLE_CREATION_ID,
      author_id: READER.id,
      parent_id: 'c0000000-0000-0000-0000-000000000001',
      body: 'Reply text',
      is_removed: false,
      created_at: '2026-01-02T01:00:00Z',
      updated_at: '2026-01-02T01:00:00Z',
      author: {
        id: READER.id,
        username: READER.username,
        display_name: READER.display_name,
        avatar_url: null,
        verified: false,
      },
    },
  ]
}

function editableDraft() {
  return {
    id: DRAFT_ID,
    type: 'poem',
    title: 'Draft title',
    caption: '',
    body_text: 'Draft body',
    body_json: { version: 1, format: 'rich', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Draft body' }] }] },
    cover_url: null,
    status: 'draft',
    audience: 'private',
    updated_at: '2026-02-01T00:00:00Z',
    is_removed: false,
    author_id: READER.id,
  }
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function handleRest(url: string, method: string, postData: unknown): unknown[] {
  const audienceResult = audienceMockHandleRest(url, method, postData)
  if (audienceResult !== undefined) return audienceResult
  const libraryResult = libraryReadingMockHandleRest(url, method, postData)
  if (libraryResult !== undefined) return libraryResult

  const posts = e2eFeedOverride ?? feedPosts()

  if (url.includes('/rest/v1/profiles_public')) {
    if (url.includes('username=eq.writertwo')) {
      return [ownProfile(OTHER.id, OTHER.username, OTHER.display_name, 12)]
    }
    if (url.includes('username=eq.readerone') || url.includes(`id=eq.${READER.id}`)) {
      return [ownProfile(READER.id, READER.username, READER.display_name, 0)]
    }
    if (url.includes('order=follower_count')) {
      return Array.from({ length: 5 }, (_, i) =>
        ownProfile(`33333333-3333-3333-3333-${String(i + 1).padStart(12, '0')}`, `writer${i}`, `Writer ${i}`),
      )
    }
    return [ownProfile(READER.id, READER.username, READER.display_name)]
  }

  if (url.includes('/rest/v1/feed_creations') || url.includes('/rest/v1/following_feed')) return posts

  if (url.includes('/rest/v1/discover_trending_creations') || url.includes('/rest/v1/discover_new_creations')) {
    return posts.slice(0, 4)
  }
  if (url.includes('/rest/v1/discover_top_week_creations')) return posts.slice(0, 2)
  if (url.includes('/rest/v1/discover_rising_writers')) return []
  if (url.includes('/rest/v1/founder_featured_writers_public')) return []

  if (url.includes('/rest/v1/rpc/writing_prompt_for_date')) return 'Write about the horizon.'
  if (url.includes('/rest/v1/rpc/tag_public_post_count')) return 2
  if (url.includes('/rest/v1/rpc/search_discovery')) {
    return {
      writers: [
        {
          id: OTHER.id,
          username: OTHER.username,
          display_name: OTHER.display_name,
          avatar_url: null,
          verified: false,
          follower_count: 12,
        },
      ],
      posts: posts.slice(0, 2).map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        caption: p.caption,
        body_excerpt: p.body_excerpt,
        body_truncated: p.body_truncated,
        published_at: p.published_at,
        like_count: p.like_count,
        author_username: OTHER.username,
        author_display_name: OTHER.display_name,
        author_avatar_url: null,
        author_verified: false,
      })),
      tags: [{ tag: 'poetry', post_count: 3 }],
    }
  }

  if (url.includes('/rest/v1/comments')) return commentTree()

  if (url.includes('/rest/v1/notifications') || url.includes('/rest/v1/mentions')) return []

  if (url.includes('/rest/v1/creations') && method === 'GET') {
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const id = idMatch?.[1]
    if (id === SAMPLE_CREATION_ID) {
      return [e2eCreationDetailOverride ?? creationDetail(SAMPLE_CREATION_ID)]
    }
    if (id === DRAFT_ID) return [editableDraft()]

    if (url.includes(`author_id=eq.${OTHER.id}`) && url.includes('status=eq.published')) {
      return publishedWorksForAuthor(OTHER.id, OTHER.username, OTHER.display_name, 12)
    }
    if (url.includes(`author_id=eq.${READER.id}`) && url.includes('status=eq.draft')) {
      return draftRows()
    }
    if (url.includes(`author_id=eq.${READER.id}`)) {
      return draftRows()
    }
    return posts
  }

  if (url.includes('/rest/v1/creation_tags')) {
    if (url.includes('tag=eq.poetry')) {
      return posts.slice(0, 3).map((p) => ({ creation_id: p.id, tag: 'poetry' }))
    }
    return []
  }

  if (url.includes('/rest/v1/likes') || url.includes('/rest/v1/saves') || url.includes('/rest/v1/follows')) {
    return []
  }

  return []
}

function isSupabaseCloudUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

export async function installSupabaseMocks(page: Page) {
  const session = sessionResponse(READER.id, READER.email)

  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (!isSupabaseCloudUrl(url)) {
      await route.continue()
      return
    }

    if (url.includes('/auth/v1/token')) {
      await fulfillJson(route, session)
      return
    }

    if (url.includes('/auth/v1/user') || url.includes('/auth/v1/session')) {
      await fulfillJson(route, session)
      return
    }

    if (url.includes('/rest/v1/rpc/is_founder')) {
      await fulfillJson(route, false)
      return
    }

    if (url.includes('/rest/v1/')) {
      let postData: unknown = null
      try {
        postData = route.request().postDataJSON()
      } catch {
        postData = null
      }
      const body = handleRest(url, route.request().method(), postData)
      await fulfillJson(route, body)
      return
    }

    if (url.includes('/storage/v1/')) {
      await fulfillJson(route, {})
      return
    }

    await fulfillJson(route, [])
  })
}

export async function seedSignedInSession(page: Page) {
  const session = sessionResponse(READER.id, READER.email)
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: AUTH_STORAGE_KEY, value: session })
}

export { SAMPLE_CREATION_ID, DRAFT_ID, resetLibraryReadingMocks, seedLibrarySave, seedReadingProgress }
