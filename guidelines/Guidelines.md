# Quest! UI Guidelines

Design and implementation rules for the Harbour Electric direction (Figma reimagining, June 2026).

## Design system

- Full spec: [`../DESIGN.md`](../DESIGN.md)
- Mobile tokens: `apps/mobile/lib/constants.ts`
- CSS tokens: `tokens/colors.css`

## Navigation

Five tabs only on mobile: **Explore · Quests · Rankings · Badges · Profile**. Map is a hidden route opened from the feed.

## Colors

| Token | Hex | Use |
|-------|-----|-----|
| Quest Sky | `#E8F3FF` | App background |
| Quest Blue | `#4364F7` | Brand, CTAs, active tab, player card |
| City Orange | `#FF6B35` | City badge, notifications |
| Navy | `#0D1B3E` | Primary text, Rankings/Profile headers |

Do not use the old Saltwater Saturday indigo (`#6366F1`) for new mobile UI.

## Components

- **Explore:** `QuestHeroCard`, `PlayerCard`, `AppHeader`, `CategoryChip`
- **Feed:** `FeedPostCard`, map preview → `(tabs)/map`
- **Rankings:** `Podium`, navy hero section
- **Badges:** dedicated `(tabs)/badges` screen
- **Profile:** navy hero, stats grid, recent activity

## Data

- Activity feed requires migration `008_public_feed_completions.sql`
- Quest hero images use `CATEGORY_IMAGES` until DB cover art exists

## Prototype

Web reference: `Gamified City Challenge App/` (Figma Make export)
