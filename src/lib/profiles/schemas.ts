import { z } from 'zod'
import { parseWebsite } from './website.ts'

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a display name.')
  .max(60, 'Use 60 characters or fewer.')

export const bioSchema = z.string().max(500, 'Use 500 characters or fewer.')

export const profileFormSchema = z
  .object({
    displayName: displayNameSchema,
    bio: bioSchema,
    website: z.string(),
    city: z.string().max(80, 'Use 80 characters or fewer.'),
    country: z.string(),
    cityVisible: z.boolean(),
    language: z.string().regex(/^[a-z]{2,8}$/, 'Choose a language.'),
    whoCanMessage: z.enum(['everyone', 'followers'], { message: 'Choose who can message you.' }),
  })
  .superRefine((value, ctx) => {
    const website = parseWebsite(value.website)
    if (!website.ok) {
      ctx.addIssue({ code: 'custom', path: ['website'], message: website.message })
    }
    if (value.country !== '' && !/^[A-Z]{2}$/.test(value.country)) {
      ctx.addIssue({ code: 'custom', path: ['country'], message: 'Choose a country.' })
    }
  })

export type ProfileFormValues = z.infer<typeof profileFormSchema>
