import { ONBOARDING_STEP_COUNT } from './constants.ts'

export function clampOnboardingStep(step: number): number {
  if (!Number.isFinite(step)) return 0
  return Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, Math.floor(step)))
}

export function nextOnboardingStep(current: number): number {
  return clampOnboardingStep(current + 1)
}

export function onboardingNeedsFlow(completedAt: string | null, step: number): boolean {
  if (completedAt) return false
  return step < ONBOARDING_STEP_COUNT
}
