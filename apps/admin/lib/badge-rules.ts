/** Unlock rule types — must stay in sync with evaluate_badge_unlock() in migration 020 */

export type UnlockRuleType =
  | 'completion_count'
  | 'category_count'
  | 'all_categories'
  | 'time_before_hour'
  | 'time_after_hour'
  | 'weekend_completions'
  | 'completions_per_day'
  | 'consecutive_days'
  | 'sponsored_quests'
  | 'first_on_quest'
  | 'total_xp'
  | 'leaderboard_top'
  | 'manual'

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type BadgeArtStyle = 'medal' | 'animated' | 'pixel'

export interface UnlockRuleField {
  key: string
  label: string
  type: 'number' | 'select' | 'text'
  options?: { value: string; label: string }[]
  default?: string | number
  min?: number
  max?: number
}

export interface UnlockRuleDefinition {
  type: UnlockRuleType
  label: string
  description: string
  fields: UnlockRuleField[]
  defaultConfig: Record<string, unknown>
  /** Human-readable unlock label for the badge card */
  summarize: (config: Record<string, unknown>) => string
}

export const QUEST_CATEGORIES = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'social', label: 'Social' },
  { value: 'food', label: 'Food' },
  { value: 'community', label: 'Community' },
  { value: 'nature', label: 'Nature' },
] as const

export const UNLOCK_RULES: UnlockRuleDefinition[] = [
  {
    type: 'completion_count',
    label: 'Total completions',
    description: 'Award when the player has enough approved quest completions.',
    fields: [{ key: 'min', label: 'Minimum completions', type: 'number', default: 1, min: 1 }],
    defaultConfig: { min: 1 },
    summarize: (c) => `Complete ${c.min ?? 1} quest${Number(c.min) === 1 ? '' : 's'}`,
  },
  {
    type: 'category_count',
    label: 'Category completions',
    description: 'Award after completing quests in a specific category.',
    fields: [
      { key: 'category', label: 'Category', type: 'select', options: [...QUEST_CATEGORIES], default: 'fitness' },
      { key: 'min', label: 'Minimum in category', type: 'number', default: 3, min: 1 },
    ],
    defaultConfig: { category: 'fitness', min: 3 },
    summarize: (c) => `Complete ${c.min ?? 3} ${c.category ?? 'fitness'} quests`,
  },
  {
    type: 'all_categories',
    label: 'All categories (Explorer)',
    description: 'At least one approved completion in every core category.',
    fields: [],
    defaultConfig: {},
    summarize: () => 'Complete 1 quest in all 5 categories',
  },
  {
    type: 'time_before_hour',
    label: 'Early completion',
    description: 'Complete a quest before a local hour (e.g. Early Bird).',
    fields: [
      { key: 'hour', label: 'Before hour (0–23)', type: 'number', default: 8, min: 0, max: 23 },
      { key: 'timezone', label: 'Timezone', type: 'text', default: 'America/Vancouver' },
    ],
    defaultConfig: { hour: 8, timezone: 'America/Vancouver' },
    summarize: (c) => `Finish a quest before ${c.hour ?? 8}:00`,
  },
  {
    type: 'time_after_hour',
    label: 'Late completion',
    description: 'Complete a quest at or after a local hour (e.g. Night Owl).',
    fields: [
      { key: 'hour', label: 'At or after hour (0–23)', type: 'number', default: 22, min: 0, max: 23 },
      { key: 'timezone', label: 'Timezone', type: 'text', default: 'America/Vancouver' },
    ],
    defaultConfig: { hour: 22, timezone: 'America/Vancouver' },
    summarize: (c) => `Finish a quest after ${c.hour ?? 22}:00`,
  },
  {
    type: 'weekend_completions',
    label: 'Weekend warrior',
    description: 'Multiple completions on the same Sat–Sun weekend.',
    fields: [{ key: 'min', label: 'Completions in one weekend', type: 'number', default: 3, min: 2 }],
    defaultConfig: { min: 3 },
    summarize: (c) => `Complete ${c.min ?? 3} quests in one weekend`,
  },
  {
    type: 'completions_per_day',
    label: 'Speed run (same day)',
    description: 'Multiple approved completions within one local calendar day.',
    fields: [{ key: 'min', label: 'Completions in one day', type: 'number', default: 3, min: 2 }],
    defaultConfig: { min: 3 },
    summarize: (c) => `Complete ${c.min ?? 3} quests in a single day`,
  },
  {
    type: 'consecutive_days',
    label: 'Daily streak',
    description: 'Approved completions on consecutive local days.',
    fields: [{ key: 'min', label: 'Consecutive days', type: 'number', default: 7, min: 2 }],
    defaultConfig: { min: 7 },
    summarize: (c) => `Quest ${c.min ?? 7} days in a row`,
  },
  {
    type: 'sponsored_quests',
    label: 'Sponsored quests',
    description: 'Distinct sponsored quests completed.',
    fields: [{ key: 'min', label: 'Distinct sponsored quests', type: 'number', default: 3, min: 1 }],
    defaultConfig: { min: 3 },
    summarize: (c) => `Complete ${c.min ?? 3} sponsored quests`,
  },
  {
    type: 'first_on_quest',
    label: 'First on quest',
    description: 'Earliest approved completion on any quest (Main Character).',
    fields: [],
    defaultConfig: {},
    summarize: () => 'Be first in the city to complete a quest',
  },
  {
    type: 'total_xp',
    label: 'Lifetime XP',
    description: 'Award when total XP crosses a threshold.',
    fields: [{ key: 'min', label: 'Minimum lifetime XP', type: 'number', default: 1000, min: 1 }],
    defaultConfig: { min: 1000 },
    summarize: (c) => `Earn ${Number(c.min ?? 1000).toLocaleString()} lifetime XP`,
  },
  {
    type: 'leaderboard_top',
    label: 'Weekly leaderboard',
    description: 'Player is in the top N of the weekly XP leaderboard.',
    fields: [{ key: 'n', label: 'Top N players', type: 'number', default: 10, min: 1, max: 100 }],
    defaultConfig: { n: 10 },
    summarize: (c) => `Reach the weekly top ${c.n ?? 10}`,
  },
  {
    type: 'manual',
    label: 'Manual only',
    description: 'Never auto-awarded — grant manually from admin.',
    fields: [],
    defaultConfig: {},
    summarize: () => 'Granted manually by admin',
  },
]

export const UNLOCK_RULES_BY_TYPE = Object.fromEntries(
  UNLOCK_RULES.map((r) => [r.type, r])
) as Record<UnlockRuleType, UnlockRuleDefinition>

export const RARITY_OPTIONS: { value: BadgeRarity; label: string; color: string }[] = [
  { value: 'common', label: 'Common', color: '#94A3B8' },
  { value: 'rare', label: 'Rare', color: '#6B8EFF' },
  { value: 'epic', label: 'Epic', color: '#FF6B35' },
  { value: 'legendary', label: 'Legendary', color: '#FBBF24' },
]

export const ART_STYLE_OPTIONS: { value: BadgeArtStyle; label: string }[] = [
  { value: 'medal', label: 'Medal' },
  { value: 'animated', label: 'Animated' },
  { value: 'pixel', label: 'Pixel' },
]

export function summarizeUnlockRule(type: UnlockRuleType, config: Record<string, unknown>): string {
  return UNLOCK_RULES_BY_TYPE[type]?.summarize(config) ?? type
}

export function parseRuleConfig(
  type: UnlockRuleType,
  raw: Record<string, string>
): Record<string, unknown> {
  const def = UNLOCK_RULES_BY_TYPE[type]
  if (!def) return {}
  const out: Record<string, unknown> = {}
  for (const field of def.fields) {
    const val = raw[field.key]
    if (val === undefined || val === '') {
      if (field.default !== undefined) out[field.key] = field.default
      continue
    }
    out[field.key] = field.type === 'number' ? parseInt(val, 10) : val
  }
  return out
}
