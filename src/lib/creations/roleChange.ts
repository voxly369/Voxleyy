import type { UserRole } from '../auth/profile.ts'

export function becameWriterAfterPublish(before: UserRole | null, after: UserRole | null): boolean {
  return before === 'reader' && after === 'writer'
}
