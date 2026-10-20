import type { Page } from '@playwright/test'
import {
  AUTH_STORAGE_KEY,
  DRAFT_ID,
  OTHER,
  READER,
  fakeAccessToken,
  installSupabaseMocks,
  seedSignedInSession,
} from './fixtures.ts'
import {
  enablePublishAudienceMocks,
  lastPublishPatch,
  resetPublishAudienceState,
  seedPublishedVariantsForViewer,
} from './publishAudienceState.ts'

export type { Audience } from './publishAudienceState.ts'

export async function installPublishAudienceMocks(page: Page) {
  resetPublishAudienceState()
  enablePublishAudienceMocks()
  await installSupabaseMocks(page)
}

export {
  lastPublishPatch,
  seedPublishedVariantsForViewer,
  seedSignedInSession,
  READER,
  OTHER,
  AUTH_STORAGE_KEY,
  DRAFT_ID,
  fakeAccessToken,
}
