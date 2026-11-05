/** Cinematic welcome sequence length (hand off before this upper bound). */
export const WELCOME_SCENE_DURATION_MS = 7_000
export const WELCOME_SCENE_MAX_MS = 8_000

export function welcomeSceneProgress(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return Math.min(1, elapsedMs / WELCOME_SCENE_DURATION_MS)
}

export function welcomeSceneShouldHandOff(elapsedMs: number): boolean {
  return elapsedMs >= WELCOME_SCENE_DURATION_MS && elapsedMs <= WELCOME_SCENE_MAX_MS
}

/** Smooth ease-in-out; no overshoot. */
export function welcomeSceneEase(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}
