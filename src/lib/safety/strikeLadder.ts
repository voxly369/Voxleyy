import {
  AUTO_HIDE_FLAGGED_POSTS_FOR_FINAL_WARNING,
  STRIKE_LADDER_ACCOUNT_MIN_POST_SUSPENSIONS,
  STRIKE_LADDER_ACCOUNT_STRIKE_THRESHOLD,
  STRIKE_LADDER_ACCOUNT_SUSPENSION_DAYS,
  STRIKE_LADDER_POST_SUSPENSION_DAYS,
} from '../../config/moderation.ts'

export type WriterStrikeState = {
  strikeCount: number
  postSuspensionCount: number
  postSuspendedUntil: Date | null
}

export function shouldApplyPostSuspension(
  flaggedHiddenPostCount: number,
  finalWarningThreshold: number = AUTO_HIDE_FLAGGED_POSTS_FOR_FINAL_WARNING,
): boolean {
  return flaggedHiddenPostCount > finalWarningThreshold
}

export function postSuspensionEndsAt(
  from: Date,
  days: number = STRIKE_LADDER_POST_SUSPENSION_DAYS,
): Date {
  const end = new Date(from)
  end.setUTCDate(end.getUTCDate() + days)
  return end
}

export function shouldApplyAccountSuspension(
  state: Pick<WriterStrikeState, 'strikeCount' | 'postSuspensionCount'>,
  strikeThreshold: number = STRIKE_LADDER_ACCOUNT_STRIKE_THRESHOLD,
  minPostSuspensions: number = STRIKE_LADDER_ACCOUNT_MIN_POST_SUSPENSIONS,
): boolean {
  return (
    state.postSuspensionCount >= minPostSuspensions && state.strikeCount >= strikeThreshold
  )
}

export function accountSuspensionEndsAt(
  from: Date,
  days: number = STRIKE_LADDER_ACCOUNT_SUSPENSION_DAYS,
): Date {
  const end = new Date(from)
  end.setUTCDate(end.getUTCDate() + days)
  return end
}

export function strikesAfterPostSuspension(
  previous: WriterStrikeState,
): WriterStrikeState {
  return {
    strikeCount: previous.strikeCount + 1,
    postSuspensionCount: previous.postSuspensionCount + 1,
    postSuspendedUntil: postSuspensionEndsAt(new Date()),
  }
}
