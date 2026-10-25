import { languageDisplayName } from '../../lib/languages/languageName.ts'

type LanguageLabelProps = {
  code: string
  className?: string
}

export function LanguageLabel({ code, className = '' }: LanguageLabelProps) {
  const name = languageDisplayName(code)
  return (
    <span className={`inline-flex items-center rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-ink ${className}`}>
      {name}
    </span>
  )
}
