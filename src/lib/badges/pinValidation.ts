import { MAX_PINNED_BADGES } from './types.ts'

export type PinValidationResult =
  | { ok: true }
  | { ok: false; message: string }

export function validatePinAction(
  pinnedKeys: readonly string[],
  badgeKey: string,
  action: 'pin' | 'unpin',
): PinValidationResult {
  if (action === 'unpin') {
    if (!pinnedKeys.includes(badgeKey)) {
      return { ok: false, message: 'That badge is not pinned.' }
    }
    return { ok: true }
  }
  if (pinnedKeys.includes(badgeKey)) {
    return { ok: false, message: 'That badge is already pinned.' }
  }
  if (pinnedKeys.length >= MAX_PINNED_BADGES) {
    return { ok: false, message: `You can pin up to ${MAX_PINNED_BADGES} badges. Unpin one first.` }
  }
  return { ok: true }
}

export function nextPinPosition(pinnedKeys: readonly string[]): number {
  return pinnedKeys.length + 1
}

export function validatePinPosition(position: number): PinValidationResult {
  if (!Number.isInteger(position) || position < 1 || position > MAX_PINNED_BADGES) {
    return { ok: false, message: 'Choose a pin slot between 1 and 3.' }
  }
  return { ok: true }
}
