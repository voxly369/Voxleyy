import { shouldShowPostLanguageLabel } from '../../lib/languages/showPostLanguageLabel.ts'
import { LanguageLabel } from './LanguageLabel.tsx'

type PostLanguageLabelProps = {
  postLanguage: string | null | undefined
  viewerLanguages: readonly string[]
  className?: string
}

export function PostLanguageLabel({ postLanguage, viewerLanguages, className }: PostLanguageLabelProps) {
  if (!shouldShowPostLanguageLabel(postLanguage, viewerLanguages)) return null
  const code = postLanguage?.trim().toLowerCase()
  if (!code) return null
  return <LanguageLabel code={code} className={className} testId="post-language-label" />
}
