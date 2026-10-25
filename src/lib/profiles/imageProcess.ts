import { validateImageFile } from './imageFile.ts'

export type PreparedImage = {
  blob: Blob
  contentType: 'image/webp'
}

export type CropAdjustment = {
  zoom?: number
  offsetX?: number
  offsetY?: number
}

const WEBP_QUALITY = 0.85

function cropBox(width: number, height: number, kind: 'avatar' | 'banner', adjust?: CropAdjustment) {
  const zoom = Math.min(3, Math.max(1, adjust?.zoom ?? 1))
  const offsetX = Math.min(1, Math.max(-1, adjust?.offsetX ?? 0))
  const offsetY = Math.min(1, Math.max(-1, adjust?.offsetY ?? 0))
  if (kind === 'avatar') {
    const side = Math.min(width, height) / zoom
    const maxShiftX = Math.max(0, width - side)
    const maxShiftY = Math.max(0, height - side)
    return {
      sx: (width - side) / 2 + (offsetX * maxShiftX) / 2,
      sy: (height - side) / 2 + (offsetY * maxShiftY) / 2,
      sw: side,
      sh: side,
      maxWidth: 512,
      maxHeight: 512,
    }
  }

  const ratio = 3
  let sw = width / zoom
  let sh = height / zoom
  if (sw / sh > ratio) sw = sh * ratio
  else sh = sw / ratio
  const maxShiftX = Math.max(0, width - sw)
  const maxShiftY = Math.max(0, height - sh)
  return {
    sx: (width - sw) / 2 + (offsetX * maxShiftX) / 2,
    sy: (height - sh) / 2 + (offsetY * maxShiftY) / 2,
    sw,
    sh,
    maxWidth: 1500,
    maxHeight: 500,
  }
}

// Drawing onto a canvas and encoding WebP drops the original file container,
// including EXIF metadata and location data.
export async function prepareProfileImage(
  file: File,
  kind: 'avatar' | 'banner',
  adjust?: CropAdjustment,
): Promise<PreparedImage> {
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

  const box = cropBox(bitmap.width, bitmap.height, kind, adjust)
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
