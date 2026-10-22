import { describe, expect, it } from 'vitest'
import { visibleProfileTabs } from './profileTabs.ts'

describe('visibleProfileTabs', () => {
  it('shows storefront for writers', () => {
    const tabs = visibleProfileTabs({ isOwn: false, role: 'writer' }).map((t) => t.id)
    expect(tabs).toContain('storefront')
    expect(tabs).not.toContain('analytics')
    expect(tabs).not.toContain('drafts')
  })

  it('shows analytics and drafts on own writer profile', () => {
    const tabs = visibleProfileTabs({ isOwn: true, role: 'writer' }).map((t) => t.id)
    expect(tabs).toEqual(['posts', 'storefront', 'analytics', 'drafts', 'about'])
  })

  it('hides writer tabs for readers', () => {
    const tabs = visibleProfileTabs({ isOwn: true, role: 'reader' }).map((t) => t.id)
    expect(tabs).toEqual(['posts', 'drafts', 'about'])
  })
})
