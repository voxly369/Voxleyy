export const SELF_HARM_TOPIC_TAG = 'self_harm'

export type SelfHarmPostContext = {
  isSelfHarmTopic: boolean
  containsSelfHarmMethods: boolean
  tags?: readonly string[]
}

/** Support banner belongs only on full post pages, not list/search surfaces. */
export function postShowsSelfHarmSupport(ctx: SelfHarmPostContext): boolean {
  if (ctx.containsSelfHarmMethods) return false
  if (ctx.isSelfHarmTopic) return true
  return (ctx.tags ?? []).some((tag) => tag.trim().toLowerCase() === SELF_HARM_TOPIC_TAG)
}

export function searchSurfaceShowsSelfHarmSupport(): boolean {
  return false
}

export function feedCardShowsSelfHarmSupport(): boolean {
  return false
}

/** Self-harm posts must not advance the writer strike ladder. */
export function selfHarmPostCountsAsStrike(ctx: Pick<SelfHarmPostContext, 'isSelfHarmTopic' | 'containsSelfHarmMethods'>): boolean {
  if (ctx.containsSelfHarmMethods) return false
  if (ctx.isSelfHarmTopic) return false
  return true
}
