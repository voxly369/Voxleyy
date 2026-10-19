import { validateImageFile } from '../profiles/imageFile.ts'

export type PreparedCover = {
  blob: Blob
  contentType: 'image/webp'
}

const WEBP_QUALITY = 0.85
const MAX_WIDTH = 1600
const MAX_HEIGHT = 1067

function fitBox(width: number, height: number) {
  const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

// Canvas encode to WebP strips EXIF and other container metadata from the original file.
export async function prepareCoverImage(file: File): Promise<PreparedCover> {
  const check = validateImageFile(file)
  if (!check.ok) throw new Error(check.message)

  const bitmap = await createImageBitmap(file)
  const { width, height } = fitBox(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('We could not process this image.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('We could not process this image.'))),
      'image/webp',
      WEBP_QUALITY,
    )
  })

  return { blob, contentType: 'image/webp' }
}
