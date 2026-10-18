// A short local blocklist, checked in addition to length, case, and a digit.
export const COMMON_PASSWORDS: readonly string[] = [
  '123456',
  'password',
  '123456789',
  '12345678',
  'password123',
  '1234567890',
  'qwerty',
  'abc123',
  'password1',
  '111111',
  '123123',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'sunshine',
  'princess',
  'football',
]

const common = new Set(COMMON_PASSWORDS)

export function isCommonPassword(value: string): boolean {
  return common.has(value.toLowerCase())
}

export type PasswordCheck = {
  id: 'length' | 'lower' | 'upper' | 'digit' | 'common'
  label: string
  met: boolean
}

export function passwordChecklist(password: string): PasswordCheck[] {
  return [
    { id: 'length', label: 'At least 10 characters', met: password.length >= 10 },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'digit', label: 'One digit', met: /[0-9]/.test(password) },
    {
      id: 'common',
      label: 'Not a common password',
      met: password.length > 0 && !isCommonPassword(password),
    },
  ]
}
