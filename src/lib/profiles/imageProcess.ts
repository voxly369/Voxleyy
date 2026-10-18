import { validateImageFile } from './imageFile.ts'

export type PreparedImage = {
  blob: Blob
  contentType: 'image/webp'
}

const WEBP_QUALITY = 0.85

function cropBox(width: number, height: number, kind: 'avatar' | 'banner') {
  if (kind === 'avatar') {
    const side = Math.min(width, height)
    return {
      sx: (width - side) / 2,
      sy: (height - side) / 2,
      sw: side,
      sh: side,
      maxWidth: 512,
      maxHeight: 512,
    }
  }

  const ratio = 1600 / 600
  let sw = width
  let sh = height
  if (sw / sh > ratio) sw = sh * ratio
  else sh = sw / ratio
  return {
    sx: (width - sw) / 2,
    sy: (height - sh) / 2,
    sw,
    sh,
    maxWidth: 1600,
    maxHeight: 600,
  }
}

// Drawing onto a canvas and encoding WebP drops the original file container,
// including EXIF metadata and location data.
export async function prepareProfileImage(file: File, kind: 'avatar' | 'banner'): Promise<PreparedImage> {
  const check = validateImageFile(file)
  if (!check.ok) throw new Error(check.message)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('That file is not a readable image.')
  }

  if (bitmap.width < 1 || bitmap.height < 1) {
    bitmap.close()
    throw new Error('That file is not a readable image.')
  }

  const box = cropBox(bitmap.width, bitmap.height, kind)
  const scale = Math.min(1, box.maxWidth / box.sw, box.maxHeight / box.sh)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(box.sw * scale))
  canvas.height = Math.max(1, Math.round(box.sh * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('We could not prepare that image.')
  }
  context.drawImage(bitmap, box.sx, box.sy, box.sw, box.sh, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/webp', WEBP_QUALITY)
  })
  if (!blob) throw new Error('We could not prepare that image.')
  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('That image is still larger than 5 MB after resizing. Try a smaller one.')
  }
  return { blob, contentType: 'image/webp' }
}
