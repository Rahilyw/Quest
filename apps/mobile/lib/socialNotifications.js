/**
 * Social inbox + rate-limit helpers (migration 029).
 * Plain JS so __tests__/logic.test.js can require it without a bundler.
 */

'use strict'

/** Inbox row copy, without the leading @username (rendered bold separately). */
function notificationText(type) {
  switch (type) {
    case 'like':
      return 'liked your quest completion.'
    case 'comment':
      return 'commented on your quest completion:'
    case 'reply':
      return 'replied to your comment:'
    case 'follow':
      return 'started following you.'
    default:
      return 'interacted with you.'
  }
}

/** Where tapping a notification (inbox row or push) should land. */
function notificationRoute(type, completionId, actorId) {
  if (type === 'follow' || !completionId) {
    return actorId ? `/user/${actorId}` : null
  }
  return `/completion/${completionId}`
}

/** Bell badge label: hidden at 0, capped at "9+". */
function formatBadgeCount(count) {
  if (!count || count < 1) return ''
  return count > 9 ? '9+' : String(count)
}

const RATE_LIMIT_MESSAGES = {
  COMMENT_RATE_LIMITED: "You're commenting a lot right now. Take a breather and try again in a few minutes.",
  LIKE_RATE_LIMITED: "You've liked a lot of posts this hour. Try again a little later.",
  FOLLOW_RATE_LIMITED: "You've followed a lot of people recently. Try again later.",
}

/** Maps a 029 rate-limit HINT to copy; null for anything else. */
function socialRateLimitMessage(hint) {
  return (hint && RATE_LIMIT_MESSAGES[hint]) || null
}

module.exports = {
  notificationText,
  notificationRoute,
  formatBadgeCount,
  socialRateLimitMessage,
}
