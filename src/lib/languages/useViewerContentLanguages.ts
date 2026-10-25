import { useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { fetchMyProfilePreferences } from '../onboarding/api.ts'
import { DEFAULT_CONTENT_LANGUAGE } from './defaultLanguage.ts'

export function useViewerContentLanguages(): string[] {
  const { profile } = useAuth()
  const fallback = profile?.language?.trim().toLowerCase() || DEFAULT_CONTENT_LANGUAGE
  const [languages, setLanguages] = useState<string[]>(() => [fallback])

  useEffect(() => {
    let active = true
    void fetchMyProfilePreferences().then((result) => {
      if (!active) return
      if (result.ok && result.data.languages.length > 0) {
        setLanguages(result.data.languages.map((code) => code.trim().toLowerCase()))
      } else {
        setLanguages([fallback])
      }
    })
    return () => {
      active = false
    }
  }, [fallback, profile?.id])

  return languages
}
