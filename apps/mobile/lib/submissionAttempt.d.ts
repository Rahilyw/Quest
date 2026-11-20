export interface CapturedAttempt {
  attemptId: string
  lat: number
  lng: number
  accuracy: number | null
  capturedAt: string
}

export type InsertErrorKind =
  | 'duplicate'
  | 'rate_limited'
  | 'party_required'
  | 'outside_zone'
  | 'rejected'
  | 'network'

export function newAttemptId(now?: number, random?: () => number): string
export function placePhotoPath(userId: string, questId: string, attemptId: string): string
export function selfiePhotoPath(userId: string, questId: string, attemptId: string): string
export function captureAttempt(
  coords: { lat: number; lng: number; accuracy?: number | null } | null | undefined,
  now?: Date,
  makeId?: (now: number) => string,
): CapturedAttempt | null
export function classifyInsertError(
  error: { code?: string | null; message?: string | null; hint?: string | null } | null | undefined,
): InsertErrorKind | null
export function photoUrlMatchesPath(url: string | null | undefined, path: string): boolean
