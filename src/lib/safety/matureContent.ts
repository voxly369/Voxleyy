/** Viewer has recorded age_18 consent (user_consents). */
export type MatureViewerContext = {
  confirmedAge18: boolean
  showMatureContentOptIn: boolean
}

export function viewerMaySeeMatureContent(viewer: MatureViewerContext): boolean {
  return viewer.confirmedAge18 && viewer.showMatureContentOptIn
}

/** Feed/search filter: non-mature posts are always visible; mature posts need eligibility. */
export function maturePostVisibleToViewer(
  isMatureContent: boolean,
  viewer: MatureViewerContext,
): boolean {
  if (!isMatureContent) return true
  return viewerMaySeeMatureContent(viewer)
}

export function publishBlockedWithoutMatureAck(input: {
  containsSexualContent: boolean
  matureContentAcknowledged: boolean
}): string | null {
  if (input.containsSexualContent && !input.matureContentAcknowledged) {
    return 'Confirm mature content before publishing sexual content.'
  }
  return null
}

export function hasConfirmedAge18Consent(
  consents: readonly { document: string }[],
): boolean {
  return consents.some((row) => row.document === 'age_18')
}
