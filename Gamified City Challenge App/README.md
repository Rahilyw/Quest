# Gamified City Challenge App

Web prototype for the **Quest!** mobile app UI — exported from Figma and kept in sync with the production design direction.

**Figma source:** [Gamified City Challenge App](https://www.figma.com/design/P1emFNKApH3m2ZFNsukYZt/Gamified-City-Challenge-App)

**Production app:** `../apps/mobile` (Expo React Native)

**Design spec:** `../DESIGN.md` (Harbour Electric)

## What this prototype covers

- 5-tab navigation: Explore, Quests (feed), Rankings, Badges, Profile
- Harbour Electric palette (`theme.css`): Quest Blue `#4364F7`, sky bg `#E8F3FF`, City Orange `#FF6B35`
- Poppins typography
- Hero-image quest cards, player XP card, activity feed, podium rankings, badge grid

## Running locally

```bash
npm install
npm run dev
```

Opens a phone-framed preview at `http://localhost:5173`.

## Project structure

```
src/
  app/
    App.tsx              — Tab shell + screen routing
    data/mock.ts         — Sample quests, feed, badges, players
    components/layout/   — BottomNav, AppBrandHeader
  styles/
    theme.css            — Design tokens (CSS variables)
    fonts.css            — Poppins import
```

## Relationship to mobile

| Prototype | Mobile equivalent |
|-----------|-------------------|
| `ExploreScreen` | `apps/mobile/app/(tabs)/index.tsx` |
| `FeedScreen` | `apps/mobile/app/(tabs)/feed.tsx` |
| `RankingsScreen` | `apps/mobile/app/(tabs)/leaderboard.tsx` |
| `BadgesScreen` | `apps/mobile/app/(tabs)/badges.tsx` |
| `ProfileScreen` | `apps/mobile/app/(tabs)/profile.tsx` |

Mobile uses live Supabase data; this prototype uses mock data in `src/app/data/mock.ts`.
