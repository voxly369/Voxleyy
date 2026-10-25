export type ChecklistKey =
  | 'profile_photo'
  | 'profile_bio'
  | 'first_post'
  | 'follow_two'
  | 'library_save'
  | 'try_reader'
  | 'send_feedback'

export type ChecklistSignals = {
  hasAvatar: boolean
  hasBio: boolean
  postCount: number
  followCount: number
  librarySaveCount: number
  readingProgressCount: number
  feedbackSent: boolean
}

export function checklistCompletion(signals: ChecklistSignals): Record<ChecklistKey, boolean> {
  return {
    profile_photo: signals.hasAvatar,
    profile_bio: signals.hasBio,
    first_post: signals.postCount > 0,
    follow_two: signals.followCount >= 2,
    library_save: signals.librarySaveCount > 0,
    try_reader: signals.readingProgressCount > 0,
    send_feedback: signals.feedbackSent,
  }
}

export function checklistDoneCount(progress: Record<ChecklistKey, boolean>): number {
  return Object.values(progress).filter(Boolean).length
}
