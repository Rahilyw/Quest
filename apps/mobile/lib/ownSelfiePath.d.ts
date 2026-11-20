/**
 * Returns a selfie storage path only when the viewer owns the completion.
 * Non-owners always get null so useSignedSelfie never signs for them.
 */
export function ownSelfiePath(
  isOwner: boolean,
  path: string | null | undefined,
): string | null
