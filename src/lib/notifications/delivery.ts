import { buildDisplayText } from './notificationText.ts'
import type { NotificationRow } from './types.ts'

export type InAppDelivery = {
  showToast: (row: NotificationRow) => void
}

export function createInAppDelivery(options: {
  quietActive: boolean
  showToast: (message: string) => void
}): InAppDelivery {
  return {
    showToast(row: NotificationRow) {
      if (options.quietActive || row.held) return
      options.showToast(buildDisplayText(row))
    },
  }
}
