export type ThemeChoice = 'system' | 'light' | 'dark'

const storageKey = 'voxly-theme'

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return true
  }
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'system' || stored === 'light' || stored === 'dark') return stored
  } catch {
    return 'dark'
  }
  return 'dark'
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const dark = choice === 'dark' || (choice === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function persistThemeChoice(choice: ThemeChoice): void {
  applyThemeChoice(choice)
  try {
    localStorage.setItem(storageKey, choice)
  } catch {
    // Storage can be blocked. The choice still applies for this visit.
  }
}
