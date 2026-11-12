'use client'

/** Long side we send to the server. The pipeline works at 1400px anyway. */
const SEND_LONG_SIDE = 2400

export const STICKER_ACCEPT = 'image/png,image/jpeg,image/webp'

/**
 * Shrink a large phone photo in the browser before upload, keeping any
 * transparency, so it fits comfortably inside the server-action body limit.
 * Small files are sent untouched.
 */
export async function prepareStickerPhoto(file: File): Promise<File> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Use a PNG, JPEG or WebP photo.')
  }
  if (typeof createImageBitmap !== 'function') return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('That photo could not be read. Try a PNG or JPEG export of it.')
  }
  const long = Math.max(bitmap.width, bitmap.height)
  if (long <= SEND_LONG_SIDE && file.size <= 4 * 1024 * 1024) {
    bitmap.close()
    return file
  }
  const scale = Math.min(1, SEND_LONG_SIDE / long)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  // JPEG has no alpha, so keep it as JPEG; PNG/WebP keep transparency as WebP.
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92))
  if (!blob) return file
  const ext = type === 'image/jpeg' ? 'jpg' : 'webp'
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + `.${ext}`, { type })
}
