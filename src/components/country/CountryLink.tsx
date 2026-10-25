import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { countryFlag, countryName } from '../../lib/profiles/countries.ts'

type CountryLinkProps = {
  code: string | null
  className?: string
  testId?: string
}

export function CountryLink({ code, className = '', testId }: CountryLinkProps) {
  const name = countryName(code)
  if (!code || !name) return null
  const flag = countryFlag(code)
  return (
    <Link
      to={`/country/${code}`}
      className={`inline-flex min-h-11 min-w-11 items-center gap-1 text-sm text-muted underline underline-offset-2 ${focusRing} ${className}`}
      data-testid={testId}
    >
      <span aria-hidden="true">{flag}</span>
      <span>{name}</span>
    </Link>
  )
}
