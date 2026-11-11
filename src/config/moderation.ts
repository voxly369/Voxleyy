/** Distinct reporters required to auto-hide a post (spec range 3–5; Founder tunes here). */
export const AUTO_HIDE_DISTINCT_REPORTERS = 3

/** Distinct auto-hidden posts before one final warning (no auto-suspension). */
export const AUTO_HIDE_FLAGGED_POSTS_FOR_FINAL_WARNING = 2

export const AUTO_HIDE_FINAL_WARNING_MESSAGE =
  'Final warning: two of your posts were automatically hidden after multiple reports. Further moderation is at the Founder\'s discretion.'

/** Days a writer cannot create or publish after post-level suspension (strike ladder). */
export const STRIKE_LADDER_POST_SUSPENSION_DAYS = 7

/** Days an account is suspended after strike-ladder account suspension. */
export const STRIKE_LADDER_ACCOUNT_SUSPENSION_DAYS = 7

/** Strikes required for account suspension (after minimum post suspensions). */
export const STRIKE_LADDER_ACCOUNT_STRIKE_THRESHOLD = 5

/** Post suspensions required before account suspension can apply at strike threshold. */
export const STRIKE_LADDER_ACCOUNT_MIN_POST_SUSPENSIONS = 2
