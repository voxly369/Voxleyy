/**
 * Playwright-only mocks for auto-hide flows. Never import from src/.
 */
type AutoHiddenRow = {
  creation_id: string
  auto_hidden_at: string
  title: string | null
  caption: string | null
  body_excerpt: string | null
  author_id: string
  author_username: string | null
  author_display_name: string | null
  distinct_reporter_count: number
  moderation_action_id: string | null
}

let hideFromFeed = false
let authorNoticePostId: string | null = null
let authorNoticeActionId: string | null = null
let queueRows: AutoHiddenRow[] = []

export function resetAutoHideMocks() {
  hideFromFeed = false
  authorNoticePostId = null
  authorNoticeActionId = null
  queueRows = []
}

export function setAutoHideHiddenForViewer(value: boolean) {
  hideFromFeed = value
}

export function getAutoHideFeedPostIds(): string[] {
  return hideFromFeed ? ['00000000-0000-0000-0000-000000000001'] : []
}

export function setAutoHideAuthorNoticePostId(postId: string, actionId?: string) {
  authorNoticePostId = postId
  authorNoticeActionId = actionId ?? '00000000-0000-0000-0000-0000000000mh'
}

export function setAutoHideQueueRows(rows: AutoHiddenRow[]) {
  queueRows = rows
}

export function autoHideMockHandleRest(url: string, method: string): unknown | undefined {
  if (url.includes('/rest/v1/founder_auto_hidden_queue')) {
    return queueRows
  }

  if (url.includes('/rest/v1/rpc/creation_viewer_gate')) {
    return 'ok'
  }

  if (url.includes('/rest/v1/rpc/my_auto_hide_moderation_action_id')) {
    return authorNoticeActionId
  }

  if (
    authorNoticePostId &&
    method === 'GET' &&
    url.includes('/rest/v1/creations') &&
    url.includes(authorNoticePostId)
  ) {
    return {
      id: authorNoticePostId,
      type: 'poem',
      title: 'Hidden sample',
      caption: null,
      body_text: 'Still visible to author',
      body_json: null,
      status: 'published',
      audience: 'public',
      cover_url: null,
      genre: null,
      mood: null,
      language: 'en',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      is_removed: false,
      removed_reason: null,
      auto_hidden_at: '2026-01-02T00:00:00.000Z',
      author_id: '11111111-1111-1111-1111-111111111111',
      author: {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'readerone',
        display_name: 'Reader One',
        avatar_url: null,
        verified: false,
      },
    }
  }

  if (hideFromFeed && url.includes('/rest/v1/feed_creations')) {
    return []
  }

  return undefined
}
