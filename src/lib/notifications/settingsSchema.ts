import { z } from 'zod'

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
const timezonePattern = /^[A-Za-z0-9_+\-/]{1,64}$/

export const quietReachSchema = z.enum(['everyone', 'close_contacts', 'pen_pals', 'nobody'])

export const notificationSettingsPatchSchema = z
  .object({
    notify_likes: z.boolean().optional(),
    notify_comments: z.boolean().optional(),
    notify_follows: z.boolean().optional(),
    notify_mentions: z.boolean().optional(),
    notify_messages: z.boolean().optional(),
    notify_sales: z.boolean().optional(),
    notify_chapters: z.boolean().optional(),
    notify_announcements: z.boolean().optional(),
    quiet_enabled: z.boolean().optional(),
    quiet_manual: z.boolean().optional(),
    quiet_schedule_start: z.string().regex(timePattern).nullable().optional(),
    quiet_schedule_end: z.string().regex(timePattern).nullable().optional(),
    quiet_reach: quietReachSchema.optional(),
    timezone: z.string().regex(timezonePattern).optional(),
    show_local_time: z.boolean().optional(),
    digest_enabled: z.boolean().optional(),
    digest_time: z.string().regex(timePattern).nullable().optional(),
  })
  .strict()

export type NotificationSettingsPatch = z.infer<typeof notificationSettingsPatchSchema>

export function parseNotificationSettingsPatch(raw: unknown): NotificationSettingsPatch | null {
  const parsed = notificationSettingsPatchSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}
