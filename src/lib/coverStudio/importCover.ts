import { validateImageFile } from '../profiles/imageFile.ts'
import { COVER_DESIGN_HEIGHT, COVER_DESIGN_WIDTH } from './designSchema.ts'

export type PreparedBookCoverImport = {
  blob: Blob
  contentType: 'image/webp'
  width: number
  height: number
}

const WEBP_QUALITY = 0.9
const TARGET_WIDTH = COVER_DESIGN_WIDTH
const TARGET_HEIGHT = COVER_DESIGN_HEIGHT
const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT

/** Centre-crop to 2:3 and export at 1600×2400 (book cover dimensions). */
export async function prepareBookCoverImport(file: File): Promise<PreparedBookCoverImport> {
  const check = validateImageFile(file)
  if (!check.ok) throw new Error(check.message)

  const bitmap = await createImageBitmap(file)
  const srcW = bitmap.width
  const srcH = bitmap.height
  const srcAspect = srcW / srcH

  let cropW = srcW
  let cropH = srcH
  let sx = 0
  let sy = 0
  if (srcAspect > TARGET_ASPECT) {
    cropW = Math.round(srcH * TARGET_ASPECT)
    sx = Math.round((srcW - cropW) / 2)
  } else if (srcAspect < TARGET_ASPECT) {
    cropH = Math.round(srcW / TARGET_ASPECT)
    sy = Math.round((srcH - cropH) / 2)
  }

  const canvas = document.createElement('canvas')
  canvas.width = TARGET_WIDTH
  canvas.height = TARGET_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('We could not process this image.')
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, TARGET_WIDTH, TARGET_HEIGHT)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('We could not process this image.'))),
      'image/webp',
      WEBP_QUALITY,
    )
  })

  return { blob, contentType: 'image/webp', width: TARGET_WIDTH, height: TARGET_HEIGHT }
}
