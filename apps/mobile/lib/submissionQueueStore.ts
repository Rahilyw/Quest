import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  makeDirectoryAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy'
import { isQueueSealed, sealQueue, staleQueueFolders } from '@/lib/queueGuard'
import {
  STORAGE_PREFIX,
  expire,
  parseStored,
  staleQueueKeys,
  storageKey,
  type QueuedProof,
} from '@/lib/submissionQueue'

/**
 * Device storage for the offline submission queue (plan Phase 3). The rules
 * live in `submissionQueue.js`; this file only reads and writes.
 *
 * Photos are copied out of the camera cache into
 * `documentDirectory/queue/<userId>/` so the OS cannot purge them while they
 * wait. Everything for a user is removed on sign-out and account deletion.
 */

function queueDir(userId: string): string | null {
  if (!documentDirectory) return null
  return `${documentDirectory}queue/${userId}/`
}

async function deleteQuietly(uri: string | null | undefined): Promise<void> {
  if (!uri) return
  try {
    await deleteAsync(uri, { idempotent: true })
  } catch {
    // A leftover file in our own folder is removed with the folder on purge.
  }
}

/** Copies a camera capture into the queue folder. Returns the new local URI. */
export async function persistPhoto(
  userId: string,
  attemptId: string,
  kind: 'place' | 'selfie',
  sourceUri: string,
): Promise<string> {
  // A signing-out or deleted player's queue takes no new photos (C-7).
  if (isQueueSealed(userId)) throw new Error('Queue is closed')
  const dir = queueDir(userId)
  if (!dir) throw new Error('No document directory on this device')
  await makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})
  const target = `${dir}${attemptId}-${kind}.jpg`
  if (target === sourceUri) return target
  await copyAsync({ from: sourceUri, to: target })
  return target
}

/** Deletes the local files of a queued proof. */
export async function deleteItemFiles(item: Pick<QueuedProof, 'placeUri' | 'selfieUri'>): Promise<void> {
  await deleteQuietly(item.placeUri)
  await deleteQuietly(item.selfieUri)
}

export async function saveQueue(userId: string, queue: readonly QueuedProof[]): Promise<void> {
  // A flush that outlives sign-out must not write a purged queue back (C-7).
  if (isQueueSealed(userId)) return
  const key = storageKey(userId)
  if (queue.length === 0) {
    await AsyncStorage.removeItem(key)
    return
  }
  await AsyncStorage.setItem(key, JSON.stringify(queue))
}

/**
 * Loads a user's queue. Items past the 72-hour limit are removed from storage
 * here, their files deleted, and returned in `expired` so the caller can tell
 * the player once.
 */
export async function loadQueue(
  userId: string,
  now: number = Date.now(),
): Promise<{ queue: QueuedProof[]; expired: QueuedProof[] }> {
  let raw: string | null = null
  try {
    raw = await AsyncStorage.getItem(storageKey(userId))
  } catch {
    return { queue: [], expired: [] }
  }
  const stored = parseStored(raw, userId)
  const { queue, expired } = expire(stored, now)
  if (expired.length > 0 || stored.length !== (raw ? safeLength(raw) : 0)) {
    await Promise.all(expired.map(deleteItemFiles))
    await saveQueue(userId, queue)
  }
  return { queue, expired }
}

function safeLength(raw: string): number {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length : -1
  } catch {
    return -1
  }
}

/** Removes everything queued for one user: the stored list and the photo folder. */
export async function purgeQueue(userId: string): Promise<void> {
  // Seal first, before any await, so nothing in flight can save after this (C-7).
  sealQueue(userId)
  try {
    await AsyncStorage.removeItem(storageKey(userId))
  } catch {
    // Nothing else to do; the next load parses defensively.
  }
  await deleteQuietly(queueDir(userId))
}

/**
 * Removes queues left by other accounts on this device (for example a sign-out
 * that never finished). Only the signed-in player's queue is kept.
 */
export async function purgeOtherUsers(userId: string): Promise<void> {
  let keys: readonly string[] = []
  try {
    keys = await AsyncStorage.getAllKeys()
  } catch {
    return
  }
  const stale = staleQueueKeys(keys, userId)
  for (const key of stale) {
    await purgeQueue(key.slice(STORAGE_PREFIX.length))
  }
  await removeOrphanFolders(userId)
}

/**
 * Removes every queue/<id>/ folder except the signed-in player's. A folder can be
 * left behind with no stored list (a crash, an interrupted sign-out), and the
 * list-based purge above never sees it (C-8).
 */
async function removeOrphanFolders(userId: string): Promise<void> {
  const root = documentDirectory ? `${documentDirectory}queue/` : null
  if (!root) return
  let names: string[] = []
  try {
    names = await readDirectoryAsync(root)
  } catch {
    return // no queue folder yet
  }
  for (const name of staleQueueFolders(names, userId)) {
    await deleteQuietly(`${root}${name}/`)
  }
}
