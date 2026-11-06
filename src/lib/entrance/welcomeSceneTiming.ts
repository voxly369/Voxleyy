/** Cinematic welcome sequence length (hand off before this upper bound). */
export const WELCOME_SCENE_DURATION_MS = 7_000
export const WELCOME_SCENE_MAX_MS = 8_000

export const WELCOME_PHASE1_END_MS = 2_500
export const WELCOME_PHASE2_END_MS = 5_000

export function welcomeSceneProgress(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return Math.min(1, elapsedMs / WELCOME_SCENE_DURATION_MS)
}

export function welcomeSceneElapsedMs(progress: number): number {
  return progress * WELCOME_SCENE_DURATION_MS
}

export function welcomeSceneShouldHandOff(elapsedMs: number): boolean {
  return elapsedMs >= WELCOME_SCENE_DURATION_MS && elapsedMs <= WELCOME_SCENE_MAX_MS
}

/** Ease-out only; no overshoot or bounce. */
export function welcomeSceneEase(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) * (1 - x)
}

export function welcomeScenePhaseT(elapsedMs: number, startMs: number, endMs: number): number {
  if (elapsedMs <= startMs) return 0
  if (elapsedMs >= endMs) return 1
  return welcomeSceneEase((elapsedMs - startMs) / (endMs - startMs))
}

/** Stagger index 0..n with 200ms steps (within 150–300ms band). */
export function welcomeSceneStagger(elapsedMs: number, phaseStartMs: number, index: number): number {
  const start = phaseStartMs + index * 200
  const span = 900
  if (elapsedMs <= start) return 0
  return welcomeSceneEase(Math.min(1, (elapsedMs - start) / span))
}
