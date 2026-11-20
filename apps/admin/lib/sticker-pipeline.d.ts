export declare class StickerError extends Error {}
export declare const ACCEPTED_TYPES: string[]
export declare const MAX_INPUT_BYTES: number
export declare const OUTPUT_LONG_SIDE: number
export declare function processSticker(
  input: Buffer
): Promise<{ buffer: Buffer; width: number; height: number; warnings: string[] }>
