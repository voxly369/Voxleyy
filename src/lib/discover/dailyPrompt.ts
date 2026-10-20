/** Deterministic UTC daily prompt index (matches SQL writing_prompt_for_date). */
export function dailyPromptIndex(promptCount: number, on = new Date()): number {
  if (promptCount <= 0) return 0
  const utcMidnight = Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate())
  const dayNumber = Math.floor(utcMidnight / 86_400_000)
  return dayNumber % promptCount
}

export function pickDailyPrompt<T>(prompts: readonly T[], on = new Date()): T | null {
  if (prompts.length === 0) return null
  return prompts[dailyPromptIndex(prompts.length, on)] ?? null
}
