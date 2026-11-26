'use strict'

/**
 * Scrubs crash and breadcrumb data before it leaves the phone (security review C-11).
 *
 * Breadcrumbs carry request URLs and navigation targets. Those can include query
 * strings (signed-URL tokens, auth fragments) and storage paths that contain a
 * player's id. Strip both. Nothing here reads coordinates or free text, because
 * the app never puts them in a URL.
 */

const MAX_DEPTH = 4

const QUERY = /\?[A-Za-z0-9_.%~-]+=[^\s"'#]*/g
const FRAGMENT = /#[A-Za-z0-9_.%~-]+=[^\s"']*/g
const STORAGE_PATH = /\b(proof-photos|proof-selfies|avatars|quest-covers|quest-cutouts)\/[^\s"'?#]+/gi

/** Removes query strings, auth fragments and storage object paths from one string. */
function scrubString(value) {
  if (typeof value !== 'string') return value
  return value.replace(QUERY, '').replace(FRAGMENT, '').replace(STORAGE_PATH, '$1/[path]')
}

function scrubValue(value, depth) {
  if (typeof value === 'string') return scrubString(value)
  if (value == null || typeof value !== 'object' || depth >= MAX_DEPTH) return value
  if (Array.isArray(value)) return value.map((entry) => scrubValue(entry, depth + 1))
  const out = {}
  for (const key of Object.keys(value)) out[key] = scrubValue(value[key], depth + 1)
  return out
}

/** Sentry `beforeBreadcrumb`: returns a scrubbed copy. */
function scrubBreadcrumb(breadcrumb) {
  if (!breadcrumb || typeof breadcrumb !== 'object') return breadcrumb
  const next = { ...breadcrumb }
  if (typeof next.message === 'string') next.message = scrubString(next.message)
  if (next.data) next.data = scrubValue(next.data, 0)
  return next
}

/** Sentry `beforeSend`: scrubs the request, message, exceptions and breadcrumbs. */
function scrubEvent(event) {
  if (!event || typeof event !== 'object') return event
  const next = { ...event }
  if (typeof next.message === 'string') next.message = scrubString(next.message)
  if (next.request && typeof next.request === 'object') {
    const request = { ...next.request }
    if (typeof request.url === 'string') request.url = scrubString(request.url)
    delete request.query_string
    delete request.cookies
    next.request = request
  }
  if (next.exception && Array.isArray(next.exception.values)) {
    next.exception = {
      ...next.exception,
      values: next.exception.values.map((entry) =>
        entry && typeof entry.value === 'string' ? { ...entry, value: scrubString(entry.value) } : entry,
      ),
    }
  }
  if (Array.isArray(next.breadcrumbs)) next.breadcrumbs = next.breadcrumbs.map(scrubBreadcrumb)
  return next
}

module.exports = { scrubString, scrubBreadcrumb, scrubEvent }
