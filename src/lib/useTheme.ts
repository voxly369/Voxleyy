import { useEffect, useState } from 'react'
import { applyThemeChoice, persistThemeChoice, readThemeChoice, type ThemeChoice } from './theme.ts'

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice)

  useEffect(() => {
    applyThemeChoice(choice)
    if (choice !== 'system') return

    let media: MediaQueryList
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }

    const onChange = () => applyThemeChoice('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [choice])

  const setTheme = (next: ThemeChoice) => {
    setChoice(next)
    persistThemeChoice(next)
  }

  return { choice, setTheme }
}
