import { z } from 'zod'
import { isCommonPassword } from './passwords.ts'
import { isReservedUsername } from './reservedUsernames.ts'

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

export const emailSchema = z.email('Enter a valid email address.')

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .refine((value) => !isCommonPassword(value), 'That password is too common. Choose another.')

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

export const signUpSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z.boolean(),
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
