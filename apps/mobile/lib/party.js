'use strict'

/**
 * Duo party helpers (card D / migration 045). Pure so Node tests can cover
 * code alphabet, lobby state and error copy without a bundler.
 */

const PARTY_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const PARTY_CODE_LENGTH = 6
const PARTY_TTL_MS = 2 * 60 * 60 * 1000

/** @param {string | null | undefined} raw */
function normalizePartyCode(raw) {
  if (typeof raw !== 'string') return ''
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** @param {string | null | undefined} raw */
function isValidPartyCode(raw) {
  const code = normalizePartyCode(raw)
  if (code.length !== PARTY_CODE_LENGTH) return false
  for (let i = 0; i < code.length; i += 1) {
    if (!PARTY_CODE_ALPHABET.includes(code[i])) return false
  }
  return true
}

/**
 * @param {string | null | undefined} expiresAt
 * @param {Date} [now]
 */
function partyExpiresInMs(expiresAt, now = new Date()) {
  if (typeof expiresAt !== 'string' || !expiresAt) return 0
  const end = Date.parse(expiresAt)
  if (!Number.isFinite(end)) return 0
  return Math.max(0, end - now.getTime())
}

/**
 * @param {string | null | undefined} expiresAt
 * @param {Date} [now]
 */
function partyExpiryLabel(expiresAt, now = new Date()) {
  const ms = partyExpiresInMs(expiresAt, now)
  if (ms <= 0) return 'This code has expired'
  const totalMin = Math.ceil(ms / 60000)
  if (totalMin < 60) {
    return totalMin === 1 ? 'Expires in 1 minute' : `Expires in ${totalMin} minutes`
  }
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (mins === 0) {
    return hours === 1 ? 'Expires in 1 hour' : `Expires in ${hours} hours`
  }
  const hourBit = hours === 1 ? '1 hour' : `${hours} hours`
  const minBit = mins === 1 ? '1 minute' : `${mins} minutes`
  return `Expires in ${hourBit} ${minBit}`
}

/**
 * Lobby partner line.
 * @param {{ username?: string | null }[] | null | undefined} members
 * @param {string | null | undefined} selfId
 */
function partyPartnerStatus(members, selfId) {
  const list = Array.isArray(members) ? members : []
  const partner = list.find((m) => m && m.user_id !== selfId) ?? list.find((m) => m && m.username)
  if (!partner || list.length < 2) return 'Waiting for a friend'
  const name = typeof partner.username === 'string' && partner.username ? partner.username : 'friend'
  return `@${name} is in`
}

/**
 * @param {{ members?: unknown[] | null, expires_at?: string | null, is_open?: boolean } | null | undefined} party
 * @param {Date} [now]
 */
function partyLobbyState(party, now = new Date()) {
  if (!party) return 'none'
  const open = party.is_open !== false && partyExpiresInMs(party.expires_at, now) > 0
  if (!open) return 'expired'
  const count = Array.isArray(party.members) ? party.members.length : 0
  if (count >= 2) return 'ready'
  return 'waiting'
}

/** Deep link / share URL for a party code. */
function partyDeepLink(code) {
  const normalized = normalizePartyCode(code)
  return `quest://party/${normalized}`
}

/**
 * Map a party RPC hint / message to friendly copy.
 * @param {string | null | undefined} hint
 * @param {string | null | undefined} message
 */
function partyErrorCopy(hint, message) {
  const key = hint || ''
  const msg = typeof message === 'string' ? message : ''
  const matched =
    key ||
    (msg.includes('PARTY_NOT_FOUND')
      ? 'PARTY_NOT_FOUND'
      : msg.includes('PARTY_EXPIRED')
        ? 'PARTY_EXPIRED'
        : msg.includes('PARTY_FULL')
          ? 'PARTY_FULL'
          : msg.includes('PARTY_SELF')
            ? 'PARTY_SELF'
            : msg.includes('PARTY_REQUIRED')
              ? 'PARTY_REQUIRED'
              : msg.includes('PARTY_RATE_LIMITED')
                ? 'PARTY_RATE_LIMITED'
                : msg.includes('PARTY_NOT_DUO')
                  ? 'PARTY_NOT_DUO'
                  : '')

  switch (matched) {
    case 'PARTY_NOT_FOUND':
      return 'That code is not right. Check it and try again.'
    case 'PARTY_EXPIRED':
      return 'That party code has expired. Ask your friend for a new one.'
    case 'PARTY_FULL':
      return 'That party is already full.'
    case 'PARTY_SELF':
      return 'That is your own code. Share it with a friend instead.'
    case 'PARTY_REQUIRED':
      return 'This quest needs a friend. Start with a friend or join their code first.'
    case 'PARTY_RATE_LIMITED':
      return 'You have started or joined a lot of parties. Try again in a bit.'
    case 'PARTY_NOT_DUO':
      return 'That quest is not a duo quest.'
    default:
      return 'Could not join that party. Try again.'
  }
}

module.exports = {
  PARTY_CODE_ALPHABET,
  PARTY_CODE_LENGTH,
  PARTY_TTL_MS,
  normalizePartyCode,
  isValidPartyCode,
  partyExpiresInMs,
  partyExpiryLabel,
  partyPartnerStatus,
  partyLobbyState,
  partyDeepLink,
  partyErrorCopy,
}
