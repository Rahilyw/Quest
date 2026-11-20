'use strict'

/**
 * Gate for private selfies (D6 / card E4).
 *
 * Only the completion owner may request a signed selfie URL. Pass the result
 * into useSignedSelfie; a null path means createSignedUrl is never called.
 *
 * @param {boolean} isOwner
 * @param {string | null | undefined} path Storage path from completions.selfie_url
 * @returns {string | null}
 */
function ownSelfiePath(isOwner, path) {
  if (!isOwner) return null
  if (typeof path !== 'string') return null
  const trimmed = path.trim()
  return trimmed.length > 0 ? trimmed : null
}

module.exports = { ownSelfiePath }
