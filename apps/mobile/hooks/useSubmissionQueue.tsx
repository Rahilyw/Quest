import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { track } from '@/lib/analytics'
import { placePhotoPath, type CapturedAttempt } from '@/lib/submissionAttempt'
import {
  enqueue,
  flushOutcome,
  markAttempt,
  markPlaceUploaded,
  nextDue,
  nextWakeAt,
  remove,
  waitedMinutesBucket,
  type QueuedProof,
} from '@/lib/submissionQueue'
import {
  deleteItemFiles,
  loadQueue,
  persistPhoto,
  purgeOtherUsers,
  saveQueue,
} from '@/lib/submissionQueueStore'
import { removeProofQuietly, submitCompletion } from '@/lib/submitCompletion'

/**
 * Offline submission queue (plan Phase 3, Spec 06 §5).
 *
 * A capture that failed with no server answer waits here and is sent when the
 * app is in the foreground again. Nothing in here is verified: the server
 * checks the zone against the captured coordinates, rate-limits and sets the
 * completion time when the proof finally arrives.
 */

export type QueueNotice =
  | { kind: 'sent'; questTitle: string; completionId: string }
  | { kind: 'dropped'; questTitle: string; reason: 'outside_zone' | 'rejected' | 'expired' }

export interface QueueCapture {
  questId: string
  questTitle: string
  xpReward: number
  isSponsored: boolean
  attempt: CapturedAttempt
  placeUri: string
  selfieUri: string | null
  placeUploaded: boolean
}

interface SubmissionQueueValue {
  items: QueuedProof[]
  sending: boolean
  notice: QueueNotice | null
  /** Copies the photos into app storage and queues the capture. */
  enqueueCapture: (capture: QueueCapture) => Promise<{ accepted: boolean }>
  sendNow: (id: string) => void
  discard: (id: string) => Promise<void>
  dismissNotice: () => void
}

const SubmissionQueueContext = createContext<SubmissionQueueValue | null>(null)

/** Longest a timer waits; the app also flushes whenever it returns to the foreground. */
const MAX_TIMER_MS = 60 * 60 * 1000

export function SubmissionQueueProvider({ children }: { children: ReactNode }) {
  const { session, refreshProfile } = useAuth()
  const userId = session?.user.id ?? null

  const [items, setItems] = useState<QueuedProof[]>([])
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<QueueNotice | null>(null)

  const queueRef = useRef<QueuedProof[]>([])
  const userRef = useRef<string | null>(null)
  const flushingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshRef = useRef(refreshProfile)
  refreshRef.current = refreshProfile

  const commit = useCallback(async (next: QueuedProof[]) => {
    queueRef.current = next
    setItems(next)
    const owner = userRef.current
    if (owner) {
      try {
        await saveQueue(owner, next)
      } catch {
        // The in-memory queue still works for this session.
      }
    }
  }, [])

  const reportExpired = useCallback((expired: QueuedProof[]) => {
    for (const item of expired) {
      track('proof_queue_dropped', { quest_id: item.questId, reason: 'expired' })
    }
    const first = expired[0]
    if (first) setNotice({ kind: 'dropped', questTitle: first.questTitle, reason: 'expired' })
  }, [])

  const flush = useCallback(async () => {
    const owner = userRef.current
    if (!owner || flushingRef.current) return
    flushingRef.current = true
    setSending(true)
    try {
      for (;;) {
        if (userRef.current !== owner) return
        const item = nextDue(queueRef.current, Date.now())
        if (!item) return

        const result = await submitCompletion({
          userId: owner,
          questId: item.questId,
          attempt: item.attempt,
          placeUri: item.placeUri,
          selfieUri: item.selfieUri,
          isSponsored: item.isSponsored,
          uploadedPlacePath: item.placeUploaded
            ? placePhotoPath(owner, item.questId, item.attempt.attemptId)
            : null,
        })
        if (userRef.current !== owner) return

        const outcome = flushOutcome(result.kind)
        if (outcome === 'retry') {
          let next = markAttempt(queueRef.current, item.id, result.kind, Date.now())
          if (result.uploadedPlacePath) next = markPlaceUploaded(next, item.id)
          await commit(next)
          // No signal or rate limited: later items would fail the same way.
          return
        }

        await commit(remove(queueRef.current, item.id))
        await deleteItemFiles(item)

        if (outcome === 'sent') {
          const completionId =
            result.kind === 'verified'
              ? result.completion.id
              : result.kind === 'duplicate'
                ? (result.ownCompletion?.id ?? null)
                : null
          track('proof_queue_sent', {
            quest_id: item.questId,
            waited_minutes: waitedMinutesBucket(item.queuedAt, Date.now()),
            already_done: completionId == null,
          })
          if (result.kind === 'verified') {
            track('completion_verified', { quest_id: item.questId, xp: item.xpReward, instant: false, queued: true })
          }
          // A duplicate from another capture means the quest was already done: nothing new to celebrate.
          if (completionId) setNotice({ kind: 'sent', questTitle: item.questTitle, completionId })
          void refreshRef.current()
        } else {
          // The server said no for good. The upload, if any, is not used by any completion.
          if (result.kind === 'rejected') {
            await removeProofQuietly('proof-photos', placePhotoPath(owner, item.questId, item.attempt.attemptId))
          }
          const reason = result.kind === 'outside_zone' ? 'outside_zone' : 'rejected'
          track('proof_queue_dropped', { quest_id: item.questId, reason })
          setNotice({ kind: 'dropped', questTitle: item.questTitle, reason })
        }
      }
    } finally {
      flushingRef.current = false
      setSending(false)
    }
  }, [commit])

  // Load this player's queue when they sign in; forget it when they sign out.
  useEffect(() => {
    userRef.current = userId
    queueRef.current = []
    setItems([])
    setNotice(null)
    if (!userId) return
    let cancelled = false
    ;(async () => {
      await purgeOtherUsers(userId)
      const { queue, expired } = await loadQueue(userId)
      if (cancelled || userRef.current !== userId) return
      queueRef.current = queue
      setItems(queue)
      reportExpired(expired)
      void flush()
    })()
    return () => {
      cancelled = true
    }
  }, [userId, flush, reportExpired])

  // Flush whenever the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush()
    })
    return () => sub.remove()
  }, [flush])

  // Wake for the next retry while the app is open.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const wake = nextWakeAt(items)
    if (wake == null || sending) return
    const delay = Math.min(Math.max(wake - Date.now(), 1000), MAX_TIMER_MS)
    timerRef.current = setTimeout(() => {
      if (AppState.currentState === 'active') void flush()
    }, delay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [items, sending, flush])

  const enqueueCapture = useCallback(
    async (capture: QueueCapture) => {
      const owner = userRef.current
      if (!owner) return { accepted: false }
      const attemptId = capture.attempt.attemptId
      let placeUri: string
      let selfieUri: string | null = null
      try {
        placeUri = await persistPhoto(owner, attemptId, 'place', capture.placeUri)
        if (capture.selfieUri) {
          selfieUri = await persistPhoto(owner, attemptId, 'selfie', capture.selfieUri).catch(() => null)
        }
      } catch {
        return { accepted: false }
      }

      const result = enqueue(
        queueRef.current,
        { ...capture, userId: owner, placeUri, selfieUri },
        Date.now(),
      )
      if (!result.accepted) {
        await deleteItemFiles({ placeUri, selfieUri })
        return { accepted: false }
      }
      await commit(result.queue)
      await Promise.all([...result.replaced, ...result.expired].map(deleteItemFiles))
      reportExpired(result.expired)
      track('proof_queued', { quest_id: capture.questId })
      return { accepted: true }
    },
    [commit, reportExpired],
  )

  const sendNow = useCallback(
    (id: string) => {
      const now = Date.now()
      void commit(queueRef.current.map((item) => (item.id === id ? { ...item, nextAttemptAt: now } : item))).then(() =>
        flush(),
      )
    },
    [commit, flush],
  )

  const discard = useCallback(
    async (id: string) => {
      const owner = userRef.current
      const item = queueRef.current.find((entry) => entry.id === id)
      if (!owner || !item) return
      await commit(remove(queueRef.current, id))
      await deleteItemFiles(item)
      if (item.placeUploaded) {
        // Storage policy 042 only lets this delete a photo no completion points at.
        await removeProofQuietly('proof-photos', placePhotoPath(owner, item.questId, item.attempt.attemptId))
      }
      track('proof_queue_dropped', { quest_id: item.questId, reason: 'discarded' })
    },
    [commit],
  )

  const dismissNotice = useCallback(() => setNotice(null), [])

  const value = useMemo(
    () => ({ items, sending, notice, enqueueCapture, sendNow, discard, dismissNotice }),
    [items, sending, notice, enqueueCapture, sendNow, discard, dismissNotice],
  )

  return <SubmissionQueueContext.Provider value={value}>{children}</SubmissionQueueContext.Provider>
}

export function useSubmissionQueue(): SubmissionQueueValue {
  const value = useContext(SubmissionQueueContext)
  if (!value) throw new Error('useSubmissionQueue must be used inside SubmissionQueueProvider')
  return value
}
