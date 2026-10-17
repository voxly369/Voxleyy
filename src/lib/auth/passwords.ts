// A short local blocklist. Length is the only other password rule.
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

export function passwordStrengthHint(password: string): string {
  if (password.length < 10) return 'Use at least 10 characters.'
  if (password.length < 14) return 'Decent length. A longer password is harder to guess.'
  return 'Long passwords are harder to guess.'
}
