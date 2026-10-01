export type ReportReason =
  | 'not_at_location'
  | 'photo_mismatch'
  | 'inappropriate'
  | 'spam'
  | 'other'

export type CommentReportReason =
  | 'harassment'
  | 'hate'
  | 'inappropriate'
  | 'spam'
  | 'other'

export interface ReasonOption<R extends string> {
  value: R
  label: string
}

export const REPORT_REASONS: ReasonOption<ReportReason>[] = [
  { value: 'not_at_location', label: "They weren't at the location" },
  { value: 'photo_mismatch', label: "Photo doesn't match the quest" },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
]

export const COMMENT_REPORT_REASONS: ReasonOption<CommentReportReason>[] = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
]

/** Reasons that open the optional free-text step before submitting. */
export function reasonNeedsDetails(reason: string): boolean {
  return reason === 'other' || reason === 'inappropriate' || reason === 'harassment' || reason === 'hate'
}

export function reportErrorMessage(
  code: string | undefined,
  hint: string | undefined,
  noun: 'post' | 'comment' = 'post'
): string {
  if (hint === 'CANNOT_REPORT_OWN') {
    return `You can't report your own ${noun}.`
  }
  if (hint === 'REPORT_RATE_LIMITED' || code === '23514') {
    return "You've filed a lot of reports today. Try again tomorrow."
  }
  if (code === '23505') {
    return `You already reported this ${noun}.`
  }
  return 'Could not submit report. Try again.'
}
