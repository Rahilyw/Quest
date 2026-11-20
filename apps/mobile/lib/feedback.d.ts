export const FEEDBACK_MAX_LENGTH: 1000

export function clampFeedbackMessage(text: unknown): string

export function feedbackResultCopy(result: 'sent' | 'unavailable' | 'failed' | string): string
