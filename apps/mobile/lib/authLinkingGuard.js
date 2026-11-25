'use strict'

/**
 * Deep-link auth guard (security review C-2).
 * Never apply inbound session tokens unless this device started an auth flow,
 * and never overwrite a live session.
 */

/**
 * @param {{
 *   hasLiveSession: boolean,
 *   pendingFlow: string | null | undefined,
 *   params: Record<string, string> | null | undefined,
 * }} opts
 * @returns {'apply' | 'ignore'}
 */
function decideAuthDeepLinkAction(opts) {
  const params = opts.params
  if (!params) return 'ignore'
  const hasToken = typeof params.access_token === 'string' && params.access_token.length > 0
  const hasCode = typeof params.code === 'string' && params.code.length > 0
  if (!hasToken && !hasCode) return 'ignore'
  if (!opts.pendingFlow) return 'ignore'
  if (opts.hasLiveSession) return 'ignore'
  return 'apply'
}

/**
 * @param {string} url
 * @returns {Record<string, string> | null}
 */
function parseAuthParams(url) {
  if (typeof url !== 'string' || url.length === 0) return null
  const hash = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : null
  if (!hash) return null
  return Object.fromEntries(new URLSearchParams(hash))
}

module.exports = {
  decideAuthDeepLinkAction,
  parseAuthParams,
}
