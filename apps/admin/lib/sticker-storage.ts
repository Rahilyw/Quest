import 'server-only'

import { supabaseAdmin } from '@/lib/supabase'
import { processSticker, StickerError, ACCEPTED_TYPES, MAX_INPUT_BYTES } from '@/lib/sticker-pipeline'

export const STICKER_BUCKET = 'quest-cutouts'

export function validateAltText(raw: unknown): { ok: true; alt: string } | { ok: false; error: string } {
  const alt = String(raw ?? '').trim().replace(/\s+/g, ' ')
  if (alt.length < 3) {
    return { ok: false, error: 'Describe the sticker for screen readers, e.g. "Soft-serve cone, Beacon Drive-In quest".' }
  }
  if (alt.length > 140) return { ok: false, error: 'Keep the alt text under 140 characters.' }
  return { ok: true, alt }
}

/**
 * Process a raw photo into a sticker (sticker-pipeline.js) and store it in the
 * quest-cutouts bucket under `folder/`. Returns its public URL and object path.
 */
export async function processAndStoreSticker(
  file: File,
  folder: string
): Promise<{ ok: true; url: string; path: string; warnings: string[] } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: 'Choose a photo first.' }
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Use a PNG, JPEG or WebP photo.' }
  }
  if (file.size > MAX_INPUT_BYTES) return { ok: false, error: 'That photo is over 15 MB. Export a smaller copy.' }

  let processed: Awaited<ReturnType<typeof processSticker>>
  try {
    processed = await processSticker(Buffer.from(await file.arrayBuffer()))
  } catch (err) {
    if (err instanceof StickerError) return { ok: false, error: err.message }
    return { ok: false, error: 'Processing that photo failed. Try a PNG or JPEG export of it.' }
  }

  const path = `${folder}/${crypto.randomUUID()}.webp`
  const { error } = await supabaseAdmin.storage
    .from(STICKER_BUCKET)
    .upload(path, processed.buffer, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' })
  if (error) return { ok: false, error: `Sticker upload failed: ${error.message}` }
  const url = supabaseAdmin.storage.from(STICKER_BUCKET).getPublicUrl(path).data.publicUrl
  return { ok: true, url, path, warnings: processed.warnings }
}

/** Best-effort removal of an object we stored, given its public URL. */
export async function removeStoredSticker(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return
  const marker = `/${STICKER_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0] ?? '')
  if (!path || path.includes('..')) return
  await supabaseAdmin.storage.from(STICKER_BUCKET).remove([path]).catch(() => {})
}
