import { z } from 'zod'

export const founderInviteCodeFormSchema = z.object({
  maxUses: z.coerce.number().int().min(1).max(10_000),
  expiresAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
})

export type FounderInviteCodeFormValues = z.infer<typeof founderInviteCodeFormSchema>
export type FounderInviteCodeFormInput = z.input<typeof founderInviteCodeFormSchema>

export function founderInviteCodeRpcPayload(values: FounderInviteCodeFormValues): {
  p_max_uses: number
  p_expires_at: string | null
  p_note: string | null
} {
  const parsed = founderInviteCodeFormSchema.parse(values)
  let expiresAt: string | null = null
  if (parsed.expiresAt) {
    const date = new Date(parsed.expiresAt)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Expiry must be a valid date.')
    }
    expiresAt = date.toISOString()
  }
  return {
    p_max_uses: parsed.maxUses,
    p_expires_at: expiresAt,
    p_note: parsed.note ?? null,
  }
}
