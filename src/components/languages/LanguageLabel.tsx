import { languageDisplayName } from '../../lib/languages/languageName.ts'

type LanguageLabelProps = {
  code: string
  className?: string
  testId?: string
}

export function LanguageLabel({ code, className = '', testId }: LanguageLabelProps) {
  const name = languageDisplayName(code)
  return (
    <span
      className={`inline-flex items-center rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-ink ${className}`}
      {...(testId ? { 'data-testid': testId } : {})}
    >
      {name}
    </span>
  )
}
