import type { UserRole } from '../auth/profile.ts'

export type ProfileTabId = 'posts' | 'drafts' | 'storefront' | 'analytics' | 'about'

export type ProfileTabDef = {
  id: ProfileTabId
  label: string
}

const TAB_LABELS: Record<ProfileTabId, string> = {
  posts: 'Posts',
  drafts: 'Drafts',
  storefront: 'Storefront',
  analytics: 'Analytics',
  about: 'About',
}

export function visibleProfileTabs(options: { isOwn: boolean; role: UserRole }): ProfileTabDef[] {
  const ids: ProfileTabId[] = ['posts']
  if (options.role === 'writer' || options.role === 'founder') {
    ids.push('storefront')
  }
  if (options.isOwn && (options.role === 'writer' || options.role === 'founder')) {
    ids.push('analytics')
  }
  if (options.isOwn) ids.push('drafts')
  ids.push('about')
  return ids.map((id) => ({ id, label: TAB_LABELS[id] }))
}

export function isWriterRole(role: UserRole): boolean {
  return role === 'writer' || role === 'founder'
}
