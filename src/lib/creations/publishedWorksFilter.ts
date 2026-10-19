/** When viewing someone else's profile, only public published works may appear in lists. */
export function shouldLimitProfileWorksToPublic(profileUserId: string, viewerUserId: string | null): boolean {
  if (!viewerUserId) return true
  return viewerUserId !== profileUserId
}
