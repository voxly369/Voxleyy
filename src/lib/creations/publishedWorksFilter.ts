/** Posts grid and listUserPublished always show published public work only (spec §6). */
export function shouldLimitProfileWorksToPublic(_profileUserId: string, _viewerUserId: string | null): boolean {
  return true
}
