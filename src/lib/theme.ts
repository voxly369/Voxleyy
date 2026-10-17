export type ThemeMode = 'dark' | 'light'

const storageKey = 'voxly-theme'

export function getTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    return 'dark'
  }
  return 'dark'
}

export function setTheme(theme: ThemeMode): void {
  try {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem(storageKey, theme)
  } catch {
    document.documentElement.classList.add('dark')
    document.documentElement.style.colorScheme = 'dark'
  }
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
