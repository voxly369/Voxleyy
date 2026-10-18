export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export type ImageFileCheck = { ok: true } | { ok: false; message: string }

export function validateImageFile(file: { type: string; size: number }): ImageFileCheck {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, message: 'Use a JPEG, PNG, or WebP image.' }
  }
  if (file.size <= 0) {
    return { ok: false, message: 'That file is empty.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'That image is larger than 5 MB.' }
  }
  return { ok: true }
}
