import { describe, expect, it } from 'vitest'
import { clampOnboardingStep, nextOnboardingStep, onboardingNeedsFlow } from './stepMachine.ts'

describe('onboarding stepMachine', () => {
  it('clamps steps to valid range', () => {
    expect(clampOnboardingStep(-1)).toBe(0)
    expect(clampOnboardingStep(99)).toBe(7)
  })

  it('advances within range', () => {
    expect(nextOnboardingStep(0)).toBe(1)
    expect(nextOnboardingStep(7)).toBe(7)
  })

  it('detects completed vs in-progress', () => {
    expect(onboardingNeedsFlow('2026-01-01T00:00:00Z', 0)).toBe(false)
    expect(onboardingNeedsFlow(null, 2)).toBe(true)
    expect(onboardingNeedsFlow(null, 7)).toBe(true)
  })
})
