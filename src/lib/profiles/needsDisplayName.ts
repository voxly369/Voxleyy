import type { PublicProfile } from './types.ts'

export function needsDisplayName(profile: Pick<PublicProfile, 'username' | 'displayName'>): boolean {
  const name = profile.displayName?.trim() ?? ''
  if (!name) return true
  return name.toLowerCase() === profile.username.toLowerCase()
}

export const DISPLAY_NAME_PROMPT_KEY = 'voxly-display-name-prompt'

export function displayNamePromptDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(DISPLAY_NAME_PROMPT_KEY) === userId
  } catch {
    return false
  }
}

export function dismissDisplayNamePrompt(userId: string) {
  try {
    localStorage.setItem(DISPLAY_NAME_PROMPT_KEY, userId)
  } catch {
    // Prompt may reappear on next visit.
  }
}
