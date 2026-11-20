'use strict'

/**
 * Offline submission queue model (plan Phase 3, Spec 06 §5). Pure: no React and
 * no I/O, so the rules run in Node. Every function returns new values and
 * never mutates its input.
 *
 * A queued proof is not verified. It is a capture waiting for the server, which
 * still re-checks the zone against the captured coordinates, the rate limit and
 * sets completed_at itself.
 */

const MAX_ITEMS = 3
const TTL_MS = 72 * 60 * 60 * 1000
const MINUTE = 60 * 1000
/** Delay before the 1st, 2nd, … retry. After the last step it stays hourly. */
const BACKOFF_MS = [30 * 1000, 2 * MINUTE, 10 * MINUTE, 30 * MINUTE, 60 * MINUTE]
const STORAGE_PREFIX = 'quest.submissionQueue.v1.'

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`
}

/** Keys under the queue prefix that belong to anyone other than `userId`. */
function staleQueueKeys(keys, userId) {
  return (keys || []).filter((key) => key.startsWith(STORAGE_PREFIX) && key !== storageKey(userId))
}

/** Delay after `attempts` failed tries (1 = the first failure). */
function backoffDelay(attempts) {
  const index = Math.max(0, Math.min(attempts, BACKOFF_MS.length) - 1)
  return BACKOFF_MS[index]
}

function makeItem(fields, now) {
  return {
    id: fields.attempt.attemptId,
    userId: fields.userId,
    questId: fields.questId,
    questTitle: fields.questTitle || '',
    xpReward: Number.isFinite(fields.xpReward) ? fields.xpReward : 0,
    isSponsored: !!fields.isSponsored,
    attempt: fields.attempt,
    placeUri: fields.placeUri,
    selfieUri: fields.selfieUri || null,
    placeUploaded: !!fields.placeUploaded,
    queuedAt: now,
    attempts: 0,
    // The screen already failed once; give the network a moment before the first retry.
    nextAttemptAt: now + BACKOFF_MS[0],
  }
}

function isExpired(item, now) {
  return now - item.queuedAt >= TTL_MS
}

/** Splits off items older than the TTL. */
function expire(queue, now) {
  const kept = []
  const expired = []
  for (const item of queue || []) (isExpired(item, now) ? expired : kept).push(item)
  return { queue: kept, expired }
}

/**
 * Adds a capture. A queued item for the same quest is replaced (the newer
 * capture wins) and returned in `replaced` so its files can be deleted.
 * Expired items are dropped first. When the queue is still full the capture is
 * refused (`accepted: false`) rather than silently dropping an older proof.
 */
function enqueue(queue, fields, now) {
  const { queue: fresh, expired } = expire(queue, now)
  const replaced = fresh.filter((item) => item.questId === fields.questId)
  const others = fresh.filter((item) => item.questId !== fields.questId)
  if (others.length >= MAX_ITEMS) {
    return { queue: fresh, accepted: false, item: null, replaced: [], expired }
  }
  const item = makeItem(fields, now)
  return { queue: [...others, item], accepted: true, item, replaced, expired }
}

/** The item to try next: due now, earliest due first. Null when none is due. */
function nextDue(queue, now) {
  let best = null
  for (const item of queue || []) {
    if (isExpired(item, now) || item.nextAttemptAt > now) continue
    if (!best || item.nextAttemptAt < best.nextAttemptAt) best = item
  }
  return best
}

/** Earliest time anything is due, or null for an empty queue. */
function nextWakeAt(queue) {
  let at = null
  for (const item of queue || []) if (at == null || item.nextAttemptAt < at) at = item.nextAttemptAt
  return at
}

/** Records a failed try and schedules the next one on the backoff ladder. */
function markAttempt(queue, id, error, now) {
  return (queue || []).map((item) => {
    if (item.id !== id) return item
    const attempts = item.attempts + 1
    return {
      ...item,
      attempts,
      lastError: error || null,
      nextAttemptAt: now + backoffDelay(attempts),
    }
  })
}

/** Records that the place photo is on the server, so later tries skip the upload. */
function markPlaceUploaded(queue, id) {
  return (queue || []).map((item) => (item.id === id ? { ...item, placeUploaded: true } : item))
}

function remove(queue, id) {
  return (queue || []).filter((item) => item.id !== id)
}

/**
 * What a flush does with an item after one try of the pipeline:
 *  - 'sent'   verified, or a duplicate (the same attempt may already have
 *             inserted before the connection dropped): remove it.
 *  - 'drop'   the server said no for good (outside the zone, rejected): remove
 *             it, delete its files, tell the player once.
 *  - 'retry'  no answer, or rate limited: keep it and back off.
 */
function flushOutcome(kind) {
  if (kind === 'verified' || kind === 'duplicate') return 'sent'
  if (kind === 'outside_zone' || kind === 'rejected' || kind === 'party_required') return 'drop'
  return 'retry'
}

/** Keeps only `userId`'s items; anything else found under the key is dropped. */
function retainUser(queue, userId) {
  const kept = []
  const foreign = []
  for (const item of queue || []) (item && item.userId === userId ? kept : foreign).push(item)
  return { queue: kept, foreign }
}

/** Reads a stored queue defensively: anything malformed is ignored. */
function parseStored(raw, userId) {
  if (typeof raw !== 'string' || !raw) return []
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const valid = parsed.filter(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.questId === 'string' &&
      typeof item.placeUri === 'string' &&
      item.attempt &&
      Number.isFinite(item.attempt.lat) &&
      Number.isFinite(item.attempt.lng) &&
      Number.isFinite(item.queuedAt) &&
      Number.isFinite(item.nextAttemptAt),
  )
  return retainUser(valid, userId).queue
}

const WAIT_BUCKETS = [0, 5, 15, 30, 60, 120, 360, 720, 1440, 2880]

/** Minutes between queueing and sending, rounded down to a coarse bucket for analytics. */
function waitedMinutesBucket(queuedAt, now) {
  const minutes = Math.max(0, (now - queuedAt) / MINUTE)
  let bucket = 0
  for (const edge of WAIT_BUCKETS) if (minutes >= edge) bucket = edge
  return bucket
}

module.exports = {
  MAX_ITEMS,
  TTL_MS,
  BACKOFF_MS,
  STORAGE_PREFIX,
  storageKey,
  staleQueueKeys,
  backoffDelay,
  enqueue,
  expire,
  nextDue,
  nextWakeAt,
  markAttempt,
  markPlaceUploaded,
  remove,
  flushOutcome,
  retainUser,
  parseStored,
  waitedMinutesBucket,
}
