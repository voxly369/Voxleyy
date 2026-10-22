import { z } from 'zod'
import { MESSAGE_BODY_MAX } from './types.ts'

export const whoCanMessageSchema = z.enum(['everyone', 'followers', 'subscribers'], {
  message: 'Choose who can message you.',
})

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message.')
  .max(MESSAGE_BODY_MAX, `Use ${MESSAGE_BODY_MAX} characters or fewer.`)

export const sendMessageSchema = z.object({
  body: messageBodySchema,
  sharedCreationId: z
    .string()
    .uuid('Choose a post to share.')
    .nullable()
    .optional(),
  deliverAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
