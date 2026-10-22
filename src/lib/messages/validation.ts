import { messageBodySchema, sendMessageSchema, type SendMessageInput } from './schemas.ts'
import { MESSAGE_BODY_MAX } from './types.ts'

export function validateMessageBody(raw: string): { ok: true; body: string } | { ok: false; message: string } {
  const parsed = messageBodySchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid message.' }
  }
  return { ok: true, body: parsed.data }
}

export function validateSendPayload(raw: {
  body: string
  sharedCreationId?: string | null
  deliverAt?: string | null
}): { ok: true; data: SendMessageInput } | { ok: false; message: string } {
  const parsed = sendMessageSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid message.' }
  }
  return { ok: true, data: parsed.data }
}

export function remainingCharacters(body: string): number {
  return MESSAGE_BODY_MAX - body.length
}
