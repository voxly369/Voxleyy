import { z } from 'zod'
import { isCommonPassword } from './passwords.ts'
import { isReservedUsername } from './reservedUsernames.ts'

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

export const emailSchema = z.email('Enter a valid email address.')

export const passwordSchema = z.string().superRefine((value, ctx) => {
  if (value.length < 10) {
    ctx.addIssue({ code: 'custom', message: 'Use at least 10 characters.' })
  }
  if (!/[a-z]/.test(value)) {
    ctx.addIssue({ code: 'custom', message: 'Use at least one lowercase letter.' })
  }
  if (!/[A-Z]/.test(value)) {
    ctx.addIssue({ code: 'custom', message: 'Use at least one uppercase letter.' })
  }
  if (!/[0-9]/.test(value)) {
    ctx.addIssue({ code: 'custom', message: 'Use at least one digit.' })
  }
  if (isCommonPassword(value)) {
    ctx.addIssue({ code: 'custom', message: 'That password is too common. Choose another.' })
  }
})

export const usernameSchema = z
  .string()
  .trim()
  .regex(USERNAME_PATTERN, 'Use 3 to 30 lowercase letters, numbers, or underscores.')
  .refine((value) => !isReservedUsername(value), 'That username is reserved.')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a display name (1 to 50 characters).')
  .max(50, 'Display name can be at most 50 characters.')

const countrySchema = z
  .string()
  .trim()
  .length(2, 'Choose your country.')
  .regex(/^[A-Z]{2}$/, 'Choose your country.')

export const signUpSchema = z
  .object({
    email: emailSchema,
    displayName: displayNameSchema,
    username: usernameSchema,
    country: countrySchema,
    timezone: z.string().trim().min(1).max(64),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z.boolean(),
    confirmedAge: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Those passwords do not match.',
      })
    }
    if (!value.acceptedTerms) {
      ctx.addIssue({
        code: 'custom',
        path: ['acceptedTerms'],
        message: 'Accept the Terms and Privacy Policy to continue.',
      })
    }
    if (!value.confirmedAge) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmedAge'],
        message: 'Confirm that you are 18 or older.',
      })
    }
  })

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Those passwords do not match.',
      })
    }
  })

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}
