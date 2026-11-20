'use strict'

/**
 * Feedback form helpers (card F). Pure so Node tests can cover the length
 * limit and result-to-copy mapping without React Native.
 */

const FEEDBACK_MAX_LENGTH = 1000

/**
 * @param {unknown} text
 * @returns {string}
 */
function clampFeedbackMessage(text) {
  return String(text ?? '').slice(0, FEEDBACK_MAX_LENGTH)
}

/**
 * User-facing copy for a sendFeedback result. Sentence case.
 * @param {'sent' | 'unavailable' | 'failed' | string} result
 * @returns {string}
 */
function feedbackResultCopy(result) {
  switch (result) {
    case 'sent':
      return 'Thanks — we got your note.'
    case 'unavailable':
      return "Feedback isn't switched on in this build yet."
    case 'failed':
      return "That didn't send. Check your signal and try again."
    default:
      return "That didn't send. Check your signal and try again."
  }
}

module.exports = { FEEDBACK_MAX_LENGTH, clampFeedbackMessage, feedbackResultCopy }
