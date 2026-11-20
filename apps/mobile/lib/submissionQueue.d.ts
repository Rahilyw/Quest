import type { CapturedAttempt } from './submissionAttempt'

export interface QueuedProof {
  /** The capture's attempt id: one storage path per capture. */
  id: string
  userId: string
  questId: string
  questTitle: string
  xpReward: number
  isSponsored: boolean
  attempt: CapturedAttempt
  /** Local file under documentDirectory/queue/<userId>/. */
  placeUri: string
  selfieUri: string | null
  /** True once the place photo is known to be on the server. */
  placeUploaded: boolean
  /** Epoch ms. */
  queuedAt: number
  attempts: number
  /** Epoch ms. */
  nextAttemptAt: number
  lastError?: string | null
}

export interface EnqueueFields {
  userId: string
  questId: string
  questTitle?: string
  xpReward?: number
  isSponsored?: boolean
  attempt: CapturedAttempt
  placeUri: string
  selfieUri?: string | null
  placeUploaded?: boolean
}

export type FlushOutcome = 'sent' | 'drop' | 'retry'

export const MAX_ITEMS: number
export const TTL_MS: number
export const BACKOFF_MS: readonly number[]
export const STORAGE_PREFIX: string

export function storageKey(userId: string): string
export function staleQueueKeys(keys: readonly string[] | null | undefined, userId: string): string[]
export function backoffDelay(attempts: number): number
export function enqueue(
  queue: readonly QueuedProof[],
  fields: EnqueueFields,
  now: number,
): {
  queue: QueuedProof[]
  accepted: boolean
  item: QueuedProof | null
  replaced: QueuedProof[]
  expired: QueuedProof[]
}
export function expire(queue: readonly QueuedProof[], now: number): { queue: QueuedProof[]; expired: QueuedProof[] }
export function nextDue(queue: readonly QueuedProof[], now: number): QueuedProof | null
export function nextWakeAt(queue: readonly QueuedProof[]): number | null
export function markAttempt(
  queue: readonly QueuedProof[],
  id: string,
  error: string | null,
  now: number,
): QueuedProof[]
export function markPlaceUploaded(queue: readonly QueuedProof[], id: string): QueuedProof[]
export function remove(queue: readonly QueuedProof[], id: string): QueuedProof[]
export function flushOutcome(kind: string): FlushOutcome
export function retainUser(
  queue: readonly QueuedProof[],
  userId: string,
): { queue: QueuedProof[]; foreign: QueuedProof[] }
export function parseStored(raw: string | null | undefined, userId: string): QueuedProof[]
export function waitedMinutesBucket(queuedAt: number, now: number): number
