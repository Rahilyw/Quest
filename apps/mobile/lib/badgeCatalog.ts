import { COLORS } from '@/lib/constants'

/**
 * Client-side badge catalog — source of truth for badge art, rarity, and copy.
 * `name` must match `badges.name` in the database exactly (the trigger in
 * migration 018 and the seed rows key off it). DB rows carry earned state;
 * this catalog carries everything the player sees.
 */

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type BadgeArtStyle = 'medal' | 'animated' | 'pixel'

export interface BadgeSpec {
  /** Stable key for the art registry */
  key: string
  /** Must match badges.name in the DB */
  name: string
  rarity: BadgeRarity
  style: BadgeArtStyle
  /** Earned-voice description */
  description: string
  /** Shown while locked — a nudge, not a spec sheet */
  lockedHint: string
  /** Short criteria label */
  unlock: string
  /** Hidden until earned: name and hint are masked */
  secret?: boolean
  /** Custom uploaded icon from admin (used when no built-in art) */
  iconUrl?: string
  /** @internal — badges without SVG art or upload */
  hasBuiltInArt?: boolean
}

export const RARITY_META: Record<
  BadgeRarity,
  { label: string; tagline: string; color: string; soft: string }
> = {
  legendary: {
    label: 'LEGENDARY',
    tagline: 'Whispered about',
    color: COLORS.sunshine,
    soft: 'rgba(251,191,36,0.16)',
  },
  epic: {
    label: 'EPIC',
    tagline: 'The long hauls',
    color: COLORS.highlight,
    soft: 'rgba(255,107,53,0.14)',
  },
  rare: {
    label: 'RARE',
    tagline: 'Prove your lane',
    color: COLORS.primary,
    soft: 'rgba(14,165,233,0.13)',
  },
  common: {
    label: 'COMMON',
    tagline: 'Everyone starts somewhere',
    color: COLORS.textMuted,
    soft: 'rgba(92,122,153,0.12)',
  },
}

export const RARITY_ORDER: BadgeRarity[] = ['legendary', 'epic', 'rare', 'common']

export const BADGE_CATALOG: BadgeSpec[] = [
  // ── LEGENDARY ──────────────────────────────────────────────────────────────
  {
    key: 'top-10',
    name: 'Top 10',
    rarity: 'legendary',
    style: 'medal',
    description: 'Weekly top 10. The podium can see your house from here.',
    lockedHint: 'Ten names on the board. Take one.',
    unlock: 'Reach the weekly top 10',
  },
  {
    key: 'over-9000',
    name: "It's Over 9000!",
    rarity: 'legendary',
    style: 'animated',
    description: '9,000 lifetime XP. Your scouter just broke.',
    lockedHint: "There's a number. It's over 9000.",
    unlock: 'Earn 9,000 lifetime XP',
  },
  {
    key: 'season-veteran',
    name: 'Season Veteran',
    rarity: 'legendary',
    style: 'medal',
    description: 'Two full seasons. Part of the furniture now — the good kind.',
    lockedHint: 'Stick around. Seasons remember.',
    unlock: 'Play 2 full seasons',
  },

  // ── EPIC ───────────────────────────────────────────────────────────────────
  {
    key: 'explorer',
    name: 'Explorer',
    rarity: 'epic',
    style: 'animated',
    description: 'Every category, conquered. The whole board is yours.',
    lockedHint: 'Five lanes. Walk them all.',
    unlock: '1 quest in all 5 categories',
  },
  {
    key: 'local-hero',
    name: 'Local Hero',
    rarity: 'epic',
    style: 'medal',
    description: "Ten quests. Streets you've never noticed know your name.",
    lockedHint: 'Ten quests. The city starts to talk.',
    unlock: 'Complete 10 quests',
  },
  {
    key: 'weekend-warrior',
    name: 'Weekend Warrior',
    rarity: 'epic',
    style: 'animated',
    description: 'Three quests in one weekend. Monday never stood a chance.',
    lockedHint: '48 hours. Make them count.',
    unlock: '3 quests in one weekend',
  },
  {
    key: 'one-does-not-simply',
    name: 'One Does Not Simply',
    rarity: 'epic',
    style: 'pixel',
    description: 'Seven straight days of questing. One does not simply do that.',
    lockedHint: 'A road goes ever on. Seven days of it.',
    unlock: 'Quest 7 days in a row',
  },
  {
    key: 'main-character',
    name: 'Main Character',
    rarity: 'epic',
    style: 'pixel',
    description: 'First in the whole city to finish a quest. Everyone else is an extra.',
    lockedHint: 'Some badges find you.',
    unlock: 'Be first in Victoria to complete a quest',
    secret: true,
  },

  // ── RARE ───────────────────────────────────────────────────────────────────
  {
    key: 'fitness-fanatic',
    name: 'Fitness Fanatic',
    rarity: 'rare',
    style: 'medal',
    description: 'Three fitness quests. Your legs filed a complaint; it was denied.',
    lockedHint: 'Sweat three times. On purpose.',
    unlock: '3 fitness quests',
  },
  {
    key: 'social-butterfly',
    name: 'Social Butterfly',
    rarity: 'rare',
    style: 'animated',
    description: 'Three social quests. You talked to real humans, out loud.',
    lockedHint: "Strangers are just rivals you haven't met.",
    unlock: '3 social quests',
  },
  {
    key: 'foodie',
    name: 'Foodie',
    rarity: 'rare',
    style: 'medal',
    description: "Three food quests deep. Victoria's kitchens know your face.",
    lockedHint: 'Eat your way to glory. Three stops.',
    unlock: '3 food quests',
  },
  {
    key: 'community-champion',
    name: 'Community Champion',
    rarity: 'rare',
    style: 'medal',
    description: 'Three community quests. The city owes you one.',
    lockedHint: 'Show up for the place that raised you.',
    unlock: '3 community quests',
  },
  {
    key: 'nature-lover',
    name: 'Nature Lover',
    rarity: 'rare',
    style: 'medal',
    description: 'Three nature quests. The ferns consider you family.',
    lockedHint: 'Three doses of the good green stuff.',
    unlock: '3 nature quests',
  },
  {
    key: 'gotta-go-fast',
    name: 'Gotta Go Fast',
    rarity: 'rare',
    style: 'pixel',
    description: 'Three quests, one day. Somewhere, a blue hedgehog nods.',
    lockedHint: "Some players walk. You won't.",
    unlock: '3 quests in a single day',
  },
  {
    key: 'tourist',
    name: 'Tourist In Your Own Town',
    rarity: 'rare',
    style: 'animated',
    description: 'Three sponsored quests. Fanny pack sold separately.',
    lockedHint: 'Play tourist. Skip the ferry ticket.',
    unlock: '3 sponsored quests',
  },

  // ── COMMON ─────────────────────────────────────────────────────────────────
  {
    key: 'first-quest',
    name: 'First Quest',
    rarity: 'common',
    style: 'medal',
    description: "You showed up. That's the whole game.",
    lockedHint: 'Every legend starts with one.',
    unlock: 'Complete your first quest',
  },
  {
    key: 'touch-grass',
    name: 'Touch Grass',
    rarity: 'common',
    style: 'pixel',
    description: 'You logged off and touched actual grass. The internet is proud.',
    lockedHint: 'Log off. Go outside. You know the one.',
    unlock: 'Complete a nature quest',
  },
  {
    key: 'early-bird',
    name: 'Early Bird',
    rarity: 'common',
    style: 'animated',
    description: 'Quest done before 8am. The harbour barely had its coffee.',
    lockedHint: 'The city looks different before 8am.',
    unlock: 'Finish a quest before 8am',
  },
  {
    key: 'night-owl',
    name: 'Night Owl',
    rarity: 'common',
    style: 'animated',
    description: 'Questing after 10pm. Respectfully, go to bed.',
    lockedHint: 'Some quests only make sense after dark.',
    unlock: 'Finish a quest after 10pm',
  },
  {
    key: 'warmed-up',
    name: 'Getting Warmed Up',
    rarity: 'common',
    style: 'animated',
    description: 'Five down. The couch is officially worried.',
    lockedHint: 'Five is where it stops being an accident.',
    unlock: 'Complete 5 quests',
  },
]

/** Look up a catalog entry by DB badge name */
export const CATALOG_BY_NAME: Record<string, BadgeSpec> = Object.fromEntries(
  BADGE_CATALOG.map((b) => [b.name, b])
)
