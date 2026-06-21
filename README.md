# Quest!

Real life, gamified. A weekly city challenge app for exploring your city.

## Structure

```
apps/
  mobile/    — Expo (React Native) app — production player client
  admin/     — Next.js admin dashboard
supabase/
  migrations/  — SQL schema (001–008)
  functions/   — Edge Functions
  seed.sql     — Starter quests + badges
Gamified City Challenge App/  — Figma Make web prototype (design reference)
tokens/        — Shared CSS design tokens
DESIGN.md      — Design system spec (Harbour Electric)
```

## Quick start

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Apply migrations in order — see [supabase/migrations/README.md](supabase/migrations/README.md) (`001` through `008`)
3. Run `supabase/seed.sql` to load starter quests and badges
4. Copy your project URL and anon key

**Migration 008** adds the RLS policy for the public activity feed. Apply via Supabase SQL Editor if the CLI is not installed:

```sql
create policy "Anyone can read approved completions"
  on completions for select
  using (status = 'approved');
```

### 2. Environment

```
cp .env.example apps/mobile/.env
cp .env.example apps/admin/.env.local
# Fill in your Supabase URL + keys
```

### 3. Mobile app

```bash
cd apps/mobile
npm install
npx expo start
```

### 4. Admin panel

```bash
cd apps/admin
npm install
npm run dev   # http://localhost:3000
```

### 5. Web design prototype (optional)

Figma export for the Harbour Electric UI direction:

```bash
cd "Gamified City Challenge App"
npm install
npm run dev
```

Figma source: [Gamified City Challenge App](https://www.figma.com/design/P1emFNKApH3m2ZFNsukYZt/Gamified-City-Challenge-App)

## Mobile navigation (5 tabs)

| Tab | Screen | Purpose |
|-----|--------|---------|
| Explore | `(tabs)/index` | Hero quest cards, player XP card, filters |
| Quests | `(tabs)/feed` | Map preview + activity feed |
| Rankings | `(tabs)/leaderboard` | Podium, chasers, featured badges |
| Badges | `(tabs)/badges` | Full badge collection |
| Profile | `(tabs)/profile` | Stats, recent activity, settings link |

Full map: `(tabs)/map` (hidden tab; opened from feed)

## CI

GitHub Actions runs on every push to `main` and on pull requests targeting `main` (see [.github/workflows/ci.yml](.github/workflows/ci.yml)):

- Mobile logic tests (`apps/mobile/__tests__/logic.test.js`)
- TypeScript check — mobile and admin

Run tests locally: `cd apps/mobile && npm test`

## Key files

| File | Purpose |
|---|---|
| `DESIGN.md` | Design system — Harbour Electric palette, components, navigation |
| `apps/mobile/lib/constants.ts` | Colors, spacing, category images, XP levels |
| `apps/mobile/lib/types.ts` | Shared TypeScript types |
| `apps/mobile/hooks/useActivityFeed.ts` | Public activity feed data |
| `apps/mobile/components/QuestHeroCard.tsx` | Image-led quest card (Explore) |
| `apps/mobile/components/PlayerCard.tsx` | Gradient XP summary card |
| `apps/mobile/components/Podium.tsx` | Rankings top-3 display |
| `apps/mobile/app/(tabs)/_layout.tsx` | 5-tab navigation |
| `apps/admin/app/completions/page.tsx` | Approve / reject queue |
| `supabase/migrations/008_public_feed_completions.sql` | Activity feed RLS policy |

## Design system

See [DESIGN.md](DESIGN.md) for the full spec. Token summary:

- **Quest Sky** `#E8F3FF` — app background
- **Quest Blue** `#4364F7` — brand, CTAs, active tab pill
- **City Orange** `#FF6B35` — city badge, notifications
- **Navy** `#0D1B3E` — primary text, Rankings/Profile headers
