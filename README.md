# Kuest

Real life, gamified. A weekly city challenge app.

## Structure

```
apps/
  mobile/    — Expo (React Native) app
  admin/     — Next.js admin dashboard
supabase/
  migrations/  — SQL schema
  functions/   — Edge Functions
  seed.sql     — Starter quests + badges
```

## Quick start

### 1. Supabase setup
1. Create a project at supabase.com
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Run `supabase/seed.sql` to load starter quests and badges
4. Copy your project URL and anon key

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
npm run dev   # http://localhost:3001
```

## Key files

| File | Purpose |
|---|---|
| `apps/mobile/lib/types.ts` | All shared TypeScript types |
| `apps/mobile/lib/constants.ts` | XP levels, category colors, geofence radius |
| `apps/mobile/lib/supabase.ts` | Supabase client |
| `apps/mobile/hooks/useAuth.ts` | Auth + profile state |
| `apps/mobile/hooks/useQuests.ts` | Quest data fetching |
| `apps/mobile/hooks/useLocation.ts` | GPS + geofence check |
| `apps/mobile/app/(tabs)/index.tsx` | Quest feed (home screen) |
| `apps/mobile/app/submit/[questId].tsx` | Photo + GPS proof submission |
| `apps/admin/app/completions/page.tsx` | Approve / reject queue |
| `apps/admin/app/quests/page.tsx` | Quest management |
| `supabase/migrations/001_initial_schema.sql` | Full DB schema + RLS + trigger |
