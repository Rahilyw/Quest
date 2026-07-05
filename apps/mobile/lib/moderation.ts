export type ReportReason =
  | 'not_at_location'
  | 'photo_mismatch'
  | 'inappropriate'
  | 'spam'
  | 'other'

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'not_at_location', label: "They weren't at the location" },
  { value: 'photo_mismatch', label: "Photo doesn't match the quest" },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
]

export function reportErrorMessage(code: string | undefined, hint: string | undefined): string {
  if (hint === 'REPORT_RATE_LIMITED' || code === '23514') {
    return "You've filed a lot of reports today. Try again tomorrow."
  }
  if (hint === 'CANNOT_REPORT_OWN') {
    return "You can't report your own post."
  }
  if (code === '23505') {
    return 'You already reported this post.'
  }
  return 'Could not submit report. Try again.'
}
