/**
 * Compact indigo pill showing the user's current level.
 * Appears overlaid on the Avatar in the profile header, and inline in the feed header.
 * Always Local Signal color — level progression is an earned/indigo concept.
 */
export interface LevelChipProps {
  /** Integer level 1–10 */
  level: number
  /** Smaller padding for overlay use (e.g. above Avatar in profile) */
  compact?: boolean
}
