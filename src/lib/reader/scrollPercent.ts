import { clampPercent } from './progressRules.ts'

export function scrollPercentFromElement(el: HTMLElement): number {
  const max = el.scrollHeight - el.clientHeight
  if (max <= 0) return 100
  return clampPercent(Math.round((el.scrollTop / max) * 100))
}
