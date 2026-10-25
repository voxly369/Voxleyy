/** Swipe-to-enter gesture maths (entrance overlay). */

export const SWIPE_COMPLETE_RATIO = 0.35
/** px/ms — fast flick completes even below ratio threshold */
export const SWIPE_FLICK_VELOCITY = 0.55
/** Vertical movement must stay below this × horizontal to count as horizontal swipe */
export const SWIPE_DIRECTION_LOCK = 1.25

export type SwipeProgress = {
  /** 0 = resting, 1 = fully swiped */
  progress: number
  /** Raw offset in px, clamped for rubber-band */
  offsetPx: number
}

export function clampSwipeOffset(deltaX: number, width: number): number {
  if (width <= 0) return 0
  const max = width
  if (deltaX < 0) return deltaX * 0.15
  if (deltaX > max) return max + (deltaX - max) * 0.15
  return deltaX
}

export function swipeProgressFromOffset(offsetPx: number, width: number): number {
  if (width <= 0) return 0
  return Math.min(1, Math.max(0, offsetPx / width))
}

export function isHorizontalSwipeLocked(absDx: number, absDy: number): boolean {
  if (absDx < 8) return false
  return absDx >= absDy * SWIPE_DIRECTION_LOCK
}

export function shouldCompleteSwipe(
  offsetPx: number,
  width: number,
  velocityX: number,
): boolean {
  if (width <= 0) return offsetPx > 40
  const progress = swipeProgressFromOffset(offsetPx, width)
  if (progress >= SWIPE_COMPLETE_RATIO) return true
  return velocityX >= SWIPE_FLICK_VELOCITY && offsetPx > width * 0.12
}

export function springBackOffset(offsetPx: number, width: number): number {
  if (offsetPx <= 0) return 0
  return shouldCompleteSwipe(offsetPx, width, 0) ? width : 0
}
