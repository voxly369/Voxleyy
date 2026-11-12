import { viewerIsAdultByDateOfBirth } from '../account/dateOfBirth.ts'

export type MatureViewerContext = {
  dateOfBirth: string | null
  showMatureContentOptIn: boolean
}

export function viewerMaySeeMatureContent(viewer: MatureViewerContext): boolean {
  if (!viewer.dateOfBirth) return false
  return viewerIsAdultByDateOfBirth(viewer.dateOfBirth) && viewer.showMatureContentOptIn
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
