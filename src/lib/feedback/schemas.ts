import { z } from 'zod'

export const feedbackCategories = ['bug', 'idea', 'felt_off', 'praise'] as const

export const feedbackFormSchema = z.object({
  category: z.enum(feedbackCategories),
  message: z.string().trim().min(10, 'Please write at least 10 characters.').max(2000),
  includePage: z.boolean(),
})

export type FeedbackCategory = (typeof feedbackCategories)[number]
