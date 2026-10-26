import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import {
  gotoFounderReportQueue,
  installSupabaseMocks,
  seedSignedInSession,
  setModerationIsFounder,
} from './fixtures.ts'
import { resetAutoHideMocks, setAutoHideQueueRows } from './autoHideMocks.ts'

for (const width of [375, 1280] as const) {
  test.describe(`auto-hide founder queue a11y @ ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test.beforeEach(async ({ page }) => {
      resetAutoHideMocks()
      await installSupabaseMocks(page)
      await seedSignedInSession(page)
    })

    test('axe on founder auto-hide queue', async ({ page }) => {
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
      await gotoFounderReportQueue(page)
      await expect(page.getByTestId('founder-auto-hide-queue')).toBeVisible()
      const results = await new AxeBuilder({ page })
        .disableRules(['page-has-heading-one', 'color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious).toEqual([])
    })
  })
}
