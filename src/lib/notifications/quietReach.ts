import type { NotificationType, QuietReach } from './types.ts'
import { isQuietModeActive } from './quietMode.ts'
import type { NotificationSettings } from './types.ts'

/** Pen Pals are not available yet; returns false until that feature ships. */
export function isPenPalContact(_recipientId: string, _actorId: string): boolean {
  return false
}

/** Close contacts = mutual follows (both users follow each other). */
export function isCloseContact(
  recipientId: string,
  actorId: string,
  mutualFollow: boolean,
): boolean {
  return mutualFollow && recipientId !== actorId
}

function isModerationType(type: NotificationType): boolean {
  return type === 'warning' || type === 'moderation_notice' || type === 'appeal_decision' || type === 'summary'
}

/**
 * Mirrors public.should_hold_for_quiet_mode (13B).
 * When reach is everyone, quiet mode only affects client toasts/sounds — rows are not held.
 */
export function shouldHoldForQuietMode(
  settings: Pick<
    NotificationSettings,
    | 'quietManual'
    | 'quietEnabled'
    | 'quietScheduleStart'
    | 'quietScheduleEnd'
    | 'timezone'
    | 'quietReach'
  >,
  actorId: string | null,
  type: NotificationType,
  options?: { mutualFollow?: boolean },
): boolean {
  if (isModerationType(type)) return false
  if (!isQuietModeActive(settings)) return false
  const reach: QuietReach = settings.quietReach ?? 'everyone'
  if (reach === 'everyone') return false
  if (reach === 'nobody') return true
  if (actorId === null) return true
  if (reach === 'pen_pals') {
    return !isPenPalContact('recipient', actorId)
  }
  if (reach === 'close_contacts') {
    return !isCloseContact('recipient', actorId, options?.mutualFollow ?? false)
  }
  return false
}
