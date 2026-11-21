import {
  classifyInsertError,
  photoUrlMatchesPath,
  placePhotoPath,
  selfiePhotoPath,
  type CapturedAttempt,
} from '@/lib/submissionAttempt'
import { supabase } from '@/lib/supabase'
import { readUriAsArrayBuffer } from '@/lib/uploadImage'

/**
 * The one upload → insert → reward-read pipeline (plan Phase 3). The submit
 * screen and the offline queue flusher both call it, so a queued proof goes
 * through exactly the checks a live one does. The server stays the authority:
 * it re-checks the geofence against the captured coordinates, rate-limits, and
 * sets `completed_at` itself.
 */

export interface SubmitCompletionInput {
  userId: string
  questId: string
  attempt: CapturedAttempt
  placeUri: string
  selfieUri?: string | null
  /** Read the sponsor redemption code after a verified insert. */
  isSponsored?: boolean
  /**
   * The storage path this capture's place photo already sits at, when an
   * earlier try uploaded it. Skips the upload; the path is deterministic.
   */
  uploadedPlacePath?: string | null
}

export interface VerifiedCompletion {
  id: string
  completed_at: string
  /** Server award when 043 is applied; omit/null when the column is missing. */
  xp_awarded?: number | null
  xp_reason?: string | null
}

interface ResultBase {
  /** The place photo's storage path once it is uploaded, else null. */
  uploadedPlacePath: string | null
}

export type SubmitCompletionResult =
  | (ResultBase & {
      kind: 'verified'
      completion: VerifiedCompletion
      /** Same as completion.xp_awarded; null when 043 is not applied yet. */
      xpAwarded: number | null
      xpReason: string | null
      redemptionCode: string | null
      newBadgeIds: string[]
    })
  | (ResultBase & {
      kind: 'duplicate'
      /**
       * The existing completion when it was written by this very capture (a
       * retry whose first insert landed but whose response was lost), else null.
       */
      ownCompletion: VerifiedCompletion | null
    })
  | (ResultBase & { kind: 'rate_limited' })
  | (ResultBase & { kind: 'outside_zone' })
  | (ResultBase & { kind: 'rejected' })
  | (ResultBase & { kind: 'network'; stage: 'upload' | 'insert' })

function isMissingXpColumn(error: { message?: string; code?: string } | null): boolean {
  const msg = (error?.message ?? '').toLowerCase()
  return msg.includes('xp_awarded') || msg.includes('xp_reason')
}

function readXpFields(row: Record<string, unknown> | null | undefined): {
  xp_awarded: number | null
  xp_reason: string | null
} {
  if (!row) return { xp_awarded: null, xp_reason: null }
  const raw = row.xp_awarded
  const n = typeof raw === 'number' ? raw : Number(raw)
  const xp_awarded = Number.isFinite(n) ? n : null
  const reason = row.xp_reason
  const xp_reason = typeof reason === 'string' && reason.length > 0 ? reason : null
  return { xp_awarded, xp_reason }
}

export type SubmitCompletionKind = SubmitCompletionResult['kind']

/** Best effort: a failed delete leaves an orphan file, it never blocks the player. */
export async function removeProofQuietly(
  bucket: 'proof-photos' | 'proof-selfies',
  path: string | null | undefined,
): Promise<void> {
  if (!path) return
  try {
    await supabase.storage.from(bucket).remove([path])
  } catch {
    // Orphaned file; storage cleanup can catch it later.
  }
}

export async function submitCompletion(input: SubmitCompletionInput): Promise<SubmitCompletionResult> {
  const { userId, questId, attempt, placeUri, selfieUri, isSponsored } = input
  // One path per capture: a retry overwrites (or skips) instead of adding a file.
  const placePath = placePhotoPath(userId, questId, attempt.attemptId)
  let uploadedPlacePath = input.uploadedPlacePath === placePath ? placePath : null

  if (!uploadedPlacePath) {
    try {
      const placeData = await readUriAsArrayBuffer(placeUri)
      const { error } = await supabase.storage
        .from('proof-photos')
        .upload(placePath, placeData, { contentType: 'image/jpeg', upsert: true })
      // A storage error keeps the capture: the player (or the queue) tries again.
      if (error) return { kind: 'network', stage: 'upload', uploadedPlacePath: null }
    } catch {
      return { kind: 'network', stage: 'upload', uploadedPlacePath: null }
    }
    uploadedPlacePath = placePath
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from('proof-photos').getPublicUrl(placePath)

  let selfiePath: string | null = null
  if (selfieUri) {
    // The place photo is the proof. A failed selfie upload does not block it.
    try {
      const path = selfiePhotoPath(userId, questId, attempt.attemptId)
      const selfieData = await readUriAsArrayBuffer(selfieUri)
      const { error } = await supabase.storage
        .from('proof-selfies')
        .upload(path, selfieData, { contentType: 'image/jpeg', upsert: true })
      if (!error) selfiePath = path
    } catch {
      selfiePath = null
    }
  }

  const insertRow = {
    user_id: userId,
    quest_id: questId,
    photo_url: publicUrl,
    selfie_url: selfiePath,
    lat: attempt.lat,
    lng: attempt.lng,
    gps_accuracy: attempt.accuracy,
    // The server sets completed_at to now() regardless (F-003).
    completed_at: new Date().toISOString(),
  }

  let completion: VerifiedCompletion | null = null
  try {
    // Prefer the 043 columns; if they are missing, retry without them so
    // pre-043 environments still verify.
    // types: Insert marks xp_awarded NOT NULL, but the server trigger owns it (043).
    let { data, error } = await supabase
      .from('completions')
      .insert(insertRow as never)
      .select('id, completed_at, xp_awarded, xp_reason')
      .single()

    if (error && isMissingXpColumn(error)) {
      ;({ data, error } = await supabase
        .from('completions')
        .insert(insertRow as never)
        .select('id, completed_at')
        .single())
    }

    if (error) {
      const kind = classifyInsertError(error)
      if (kind === 'network' || kind == null) {
        return { kind: 'network', stage: 'insert', uploadedPlacePath }
      }
      if (kind === 'duplicate') {
        // A retry whose first insert landed also ends here, and that row uses
        // this attempt's photo. Only delete when the existing completion is
        // confirmed to be a different attempt.
        let existingQuery = await supabase
          .from('completions')
          .select('id, completed_at, photo_url, xp_awarded, xp_reason')
          .eq('user_id', userId)
          .eq('quest_id', questId)
          .maybeSingle()
        if (existingQuery.error && isMissingXpColumn(existingQuery.error)) {
          existingQuery = await supabase
            .from('completions')
            .select('id, completed_at, photo_url')
            .eq('user_id', userId)
            .eq('quest_id', questId)
            .maybeSingle()
        }
        const existing = existingQuery.data
        if (existing && !photoUrlMatchesPath(existing.photo_url, placePath)) {
          await removeProofQuietly('proof-photos', placePath)
          await removeProofQuietly('proof-selfies', selfiePath)
          return { kind: 'duplicate', ownCompletion: null, uploadedPlacePath: null }
        }
        const xp = readXpFields(existing as Record<string, unknown> | null)
        return {
          kind: 'duplicate',
          ownCompletion: existing
            ? {
                id: existing.id,
                completed_at: existing.completed_at,
                xp_awarded: xp.xp_awarded,
                xp_reason: xp.xp_reason,
              }
            : null,
          uploadedPlacePath,
        }
      }

      // Any other server answer means no row points at this attempt's selfie.
      await removeProofQuietly('proof-selfies', selfiePath)
      if (kind === 'outside_zone') {
        // Final for this capture: it would never be used again.
        await removeProofQuietly('proof-photos', placePath)
        return { kind: 'outside_zone', uploadedPlacePath: null }
      }
      // rate_limited keeps the place photo for a retry. rejected keeps it too;
      // the caller deletes it when the player gives up on the capture.
      return { kind, uploadedPlacePath }
    }
    const xp = readXpFields(data as Record<string, unknown> | null)
    completion = data
      ? {
          id: data.id,
          completed_at: data.completed_at,
          xp_awarded: xp.xp_awarded,
          xp_reason: xp.xp_reason,
        }
      : null
  } catch {
    // No server answer: the row may or may not exist.
    return { kind: 'network', stage: 'insert', uploadedPlacePath }
  }

  if (!completion) return { kind: 'network', stage: 'insert', uploadedPlacePath }

  // The row exists from here on. Reward reads are best effort.
  let redemptionCode: string | null = null
  let newBadgeIds: string[] = []
  let xpAwarded = completion.xp_awarded ?? null
  let xpReason = completion.xp_reason ?? null
  try {
    // Always ask for the reward payload: redemption when sponsored, and XP
    // fields when the insert select lacked them (or 043 filled them only here).
    const { data: reward } = await supabase.rpc('own_completion_reward', {
      p_completion_id: completion.id,
    })
    if (reward && typeof reward === 'object' && !Array.isArray(reward)) {
      const row = reward as Record<string, unknown>
      if (isSponsored) {
        const code = row.redemption_code
        redemptionCode = typeof code === 'string' ? code : null
      }
      const fromRpc = readXpFields(row)
      if (xpAwarded == null && fromRpc.xp_awarded != null) xpAwarded = fromRpc.xp_awarded
      if (xpReason == null && fromRpc.xp_reason != null) xpReason = fromRpc.xp_reason
    }

    // Badge unlocks run in the insert's transaction, so their earned_at equals
    // the server-set completed_at. Anything at or after it is new.
    if (completion.completed_at) {
      const { data: earned } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)
        .gte('earned_at', completion.completed_at)
      newBadgeIds = (earned ?? []).map((row) => row.badge_id)
    }
  } catch {
    // The completion stands; the celebration just shows less.
  }

  completion = { ...completion, xp_awarded: xpAwarded, xp_reason: xpReason }
  return {
    kind: 'verified',
    completion,
    xpAwarded,
    xpReason,
    redemptionCode,
    newBadgeIds,
    uploadedPlacePath,
  }
}
