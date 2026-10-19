import type { Audience } from './types.ts'

export type AudienceOption = {
  value: Audience
  label: string
  description: string
}

/** Wording aligned with docs/SPEC.md publishing and audience (§17 publish flow, visibility). */
export const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Listed for signed-in readers who are not blocked. Anyone on Voxly can open it from your profile and discovery.',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Not listed for discovery. Any signed-in reader who is not blocked can still open it when they have the link.',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see it. It stays off your public works list for everyone else.',
  },
]

export function audienceLabel(value: Audience): string {
  return AUDIENCE_OPTIONS.find((option) => option.value === value)?.label ?? value
}
