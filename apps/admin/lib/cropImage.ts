/** Crop helpers for quest cover images (16:10). */

export const COVER_ASPECT = 16 / 10
export const COVER_OUTPUT_WIDTH = 1400
export const COVER_OUTPUT_HEIGHT = 875

export type PixelCrop = {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.crossOrigin = 'anonymous'
    img.src = src
  })
}

/** Render a pixel crop to a JPEG File at the cover output size. */
export async function getCroppedCoverFile(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName = 'quest-cover.jpg'
): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = COVER_OUTPUT_WIDTH
  canvas.height = COVER_OUTPUT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas context.')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    COVER_OUTPUT_WIDTH,
    COVER_OUTPUT_HEIGHT
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode cropped image.'))),
      'image/jpeg',
      0.9
    )
  })

  return new File([blob], fileName, { type: 'image/jpeg' })
}
