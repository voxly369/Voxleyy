/**
 * Founder access is decided only by the server (`is_founder()` RPC).
 * Client-side flags, storage, or query params must never grant Founder UI.
 */
export function founderAccessFromRpc(isFounderRpc: boolean | null | undefined): boolean {
  return isFounderRpc === true
}
