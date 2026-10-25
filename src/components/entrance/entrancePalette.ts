export type EntrancePalette = 'dawn' | 'day' | 'dusk' | 'night'

export function entrancePaletteForHour(hour: number): EntrancePalette {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'dusk'
  return 'night'
}
