'use strict'

/**
 * One capture is one submission attempt (plan Phase 1d; the Spec 06 §5 offline
 * queue reuses this). The attempt id and coordinates are fixed when the place
 * photo is taken, so every retry of that capture writes the same storage object
 * and sends the same location instead of re-reading live GPS.
 */

function newAttemptId(now = Date.now(), random = Math.random) {
  let suffix = ''
  while (suffix.length < 10) suffix += random().toString(36).slice(2)
  return `${Math.floor(now).toString(36)}-${suffix.slice(0, 10)}`
}

function placePhotoPath(userId, questId, attemptId) {
  return `${userId}/${questId}/${attemptId}.jpg`
}

function selfiePhotoPath(userId, questId, attemptId) {
  return `${userId}/${questId}-${attemptId}.jpg`
}

/** Freeze the coordinates of a capture. Returns null when there is no usable fix. */
function captureAttempt(coords, now = new Date(), makeId = newAttemptId) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null
  return {
    attemptId: makeId(now.getTime()),
    lat: coords.lat,
    lng: coords.lng,
    accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
    capturedAt: now.toISOString(),
  }
}

/**
 * What a `completions` insert error means for the attempt:
 *  - 'duplicate'       23505, the player already has this quest
 *  - 'rate_limited'    retry later, keep the upload
 *  - 'party_required'  duo quest needs a full open party (045)
 *  - 'outside_zone'    final for this capture, delete the upload
 *  - 'rejected'        any other server answer, the row was not written
 *  - 'network'         no server answer, the row may or may not exist
 *
 * RATE_LIMITED / PARTY_REQUIRED are raised with SQLSTATE 23514
 * (check_violation), the same code as GEOFENCE_VIOLATION, so they have to be
 * matched first.
 */
function classifyInsertError(error) {
  if (!error) return null
  const message = typeof error.message === 'string' ? error.message : ''
  if (error.code === '23505') return 'duplicate'
  if (message.includes('RATE_LIMITED') || error.hint === 'RATE_LIMITED') return 'rate_limited'
  if (message.includes('PARTY_REQUIRED') || error.hint === 'PARTY_REQUIRED') return 'party_required'
  if (message.includes('GEOFENCE_VIOLATION') || error.code === '23514') return 'outside_zone'
  if (error.code) return 'rejected'
  return 'network'
}

/** True when a stored proof-photos public URL points at this storage path. */
function photoUrlMatchesPath(url, path) {
  return typeof url === 'string' && typeof path === 'string' && url.endsWith(`/proof-photos/${path}`)
}

module.exports = {
  newAttemptId,
  placePhotoPath,
  selfiePhotoPath,
  captureAttempt,
  classifyInsertError,
  photoUrlMatchesPath,
}
