'use strict'

/**
 * Guards for the offline submission queue (security review C-7 and C-8).
 *
 * C-7: sign-out purges a player's queue, but a flush that was already in flight
 * could finish afterwards and write the queue back, coordinates included. A
 * purge now seals that player's queue first, synchronously. A sealed queue
 * refuses to save and refuses new photos until that player signs in again.
 *
 * C-8: queued photos live in per-player folders under queue/. A folder whose
 * stored list is gone (a crash, an interrupted sign-out) is an orphan; the
 * signed-in player's folder is the only one that should exist.
 */

const sealed = new Set()

function sealQueue(userId) {
  if (typeof userId === 'string' && userId.length > 0) sealed.add(userId)
}

function unsealQueue(userId) {
  sealed.delete(userId)
}

function isQueueSealed(userId) {
  return sealed.has(userId)
}

/** Test helper: forget every seal. */
function resetQueueSeals() {
  sealed.clear()
}

/**
 * Folder names under queue/ that do not belong to the signed-in player.
 * Names come from a directory listing, so they may carry a trailing slash.
 *
 * @param {readonly string[]} names
 * @param {string} userId
 * @returns {string[]}
 */
function staleQueueFolders(names, userId) {
  const out = []
  for (const raw of names) {
    const name = typeof raw === 'string' ? raw.replace(/\/+$/, '') : ''
    if (name.length === 0 || name === userId) continue
    // A path separator or dot segment in a listing entry is never ours to follow.
    if (name === '.' || name === '..' || name.includes('/') || name.includes('\\')) continue
    out.push(name)
  }
  return out
}

module.exports = { sealQueue, unsealQueue, isQueueSealed, resetQueueSeals, staleQueueFolders }
