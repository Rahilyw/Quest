'use strict'

/**
 * Small pure rules for admin server code (security review B-5, B-6, B-7), kept in
 * plain CommonJS so the Node test script can run them without a bundler.
 */

// B-6: the admin completions screen names the columns it shows. `select('*')`
// would also send anything added to the table later to the browser.
const COMPLETION_COLUMNS = [
  'id',
  'photo_url',
  'lat',
  'lng',
  'completed_at',
  'status',
  'user_id',
  'quest_id',
  'redemption_code',
  'xp_awarded',
  'xp_reason',
]
const COMPLETIONS_DEFAULT_LIMIT = 100
const COMPLETIONS_MAX_LIMIT = 200

/** Server-side cap on a client-supplied page size. */
function clampCompletionsLimit(limit) {
  const n = Math.floor(Number(limit))
  if (!Number.isFinite(n) || n < 1) return COMPLETIONS_DEFAULT_LIMIT
  return Math.min(n, COMPLETIONS_MAX_LIMIT)
}

// B-5: the sponsor CSV needs counts, never the redemption codes themselves.
function summariseSponsoredQuest(quest) {
  const rows = Array.isArray(quest.completions) ? quest.completions : []
  const redeemedAt = rows
    .map((row) => row.redeemed_at)
    .filter((value) => typeof value === 'string' && value !== '')
    .sort()
  return {
    title: quest.title,
    sponsor_name: quest.sponsor_name ?? null,
    sponsor_reward: quest.sponsor_reward ?? null,
    total: rows.length,
    approved: rows.filter((row) => row.status === 'approved').length,
    pending: rows.filter((row) => row.status === 'pending').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
    issued: rows.filter((row) => row.redemption_code).length,
    redeemed: rows.filter((row) => row.redeemed_at).length,
    lastRedemption: redeemedAt.length > 0 ? redeemedAt[redeemedAt.length - 1] : '',
  }
}

// B-7: a hand grant only makes sense for stickers an admin hands out. Quest
// stickers are earned by completing the quest, and badge stickers by the badge.
function canGrantStickerByHand(sticker) {
  if (!sticker || sticker.is_active === false) return false
  if (sticker.unlock_rule === 'manual' || sticker.unlock_rule === 'season') {
    return sticker.quest_id == null
  }
  return false
}

module.exports = {
  COMPLETION_COLUMNS,
  COMPLETIONS_DEFAULT_LIMIT,
  COMPLETIONS_MAX_LIMIT,
  clampCompletionsLimit,
  summariseSponsoredQuest,
  canGrantStickerByHand,
}
