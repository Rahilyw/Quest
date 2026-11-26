export declare const MAX_COVER_PIXELS: number
export declare function sniffCover(
  buffer: Buffer,
  sharpImpl?: unknown
): Promise<{ ext: string; contentType: string } | null>
