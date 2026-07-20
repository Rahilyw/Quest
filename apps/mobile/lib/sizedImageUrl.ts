/**
 * Request a resized variant when the host supports it.
 * - Unsplash: width/height query params
 * - Supabase public storage: /storage/v1/render/image/public/…
 * Other URLs are returned unchanged.
 */
export function sizedImageUrl(
  url: string,
  opts: { width: number; height?: number } = { width: 700 },
): string {
  if (!url) return url

  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes('images.unsplash.com')) {
      parsed.searchParams.set('w', String(opts.width))
      if (opts.height != null) parsed.searchParams.set('h', String(opts.height))
      parsed.searchParams.set('fit', 'crop')
      parsed.searchParams.set('auto', 'format')
      return parsed.toString()
    }

    const publicMarker = '/storage/v1/object/public/'
    const idx = parsed.pathname.indexOf(publicMarker)
    if (idx !== -1) {
      const objectPath = parsed.pathname.slice(idx + publicMarker.length)
      const renderPath = `/storage/v1/render/image/public/${objectPath}`
      const renderUrl = new URL(renderPath, parsed.origin)
      renderUrl.searchParams.set('width', String(opts.width))
      if (opts.height != null) renderUrl.searchParams.set('height', String(opts.height))
      renderUrl.searchParams.set('resize', 'contain')
      return renderUrl.toString()
    }
  } catch {
    return url
  }

  return url
}
