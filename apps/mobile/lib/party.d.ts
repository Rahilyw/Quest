export const PARTY_CODE_ALPHABET: string
export const PARTY_CODE_LENGTH: number
export const PARTY_TTL_MS: number

export function normalizePartyCode(raw: string | null | undefined): string
export function isValidPartyCode(raw: string | null | undefined): boolean
export function partyExpiresInMs(expiresAt: string | null | undefined, now?: Date): number
export function partyExpiryLabel(expiresAt: string | null | undefined, now?: Date): string
export function partyPartnerStatus(
  members: { user_id?: string; username?: string | null }[] | null | undefined,
  selfId: string | null | undefined,
): string
export type PartyLobbyState = 'none' | 'waiting' | 'ready' | 'expired'
export function partyLobbyState(
  party:
    | { members?: unknown[] | null; expires_at?: string | null; is_open?: boolean }
    | null
    | undefined,
  now?: Date,
): PartyLobbyState
export function partyDeepLink(code: string): string
export function partyErrorCopy(
  hint: string | null | undefined,
  message?: string | null | undefined,
): string
