# Quest! Architecture

Visual map of the codebase — a monorepo for a gamified city quest app with two clients, a Figma web prototype, and a Supabase backend.

## High-level architecture

```mermaid
flowchart TB
    subgraph Monorepo["Quest! (Yarn workspaces)"]
        direction TB
        Mobile["apps/mobile<br/>Expo · React Native · Expo Router"]
        Admin["apps/admin<br/>Next.js 14 · port 3000"]
        Prototype["Gamified City Challenge App<br/>Vite · Figma Make prototype"]
    end

    subgraph Supabase["supabase/"]
        Auth["Auth"]
        DB["PostgreSQL + RLS + PostGIS"]
        Storage["Storage: proof-photos · avatars · quest-covers"]
        Edge["Edge Functions"]
        Migrations["migrations/001–015"]
        Seed["seed.sql"]
    end

    Player["Player (mobile)"] --> Mobile
    Operator["Admin operator (web)"] --> Admin
    Designer["Design reference"] --> Prototype

    Mobile --> Auth
    Mobile --> DB
    Mobile --> Storage
    Admin --> DB
    Admin --> Edge

    Edge --> DB
    Migrations --> DB
    Seed --> DB
```

## Mobile app structure

```mermaid
flowchart LR
    subgraph Routes["app/ (Expo Router)"]
        Auth["(auth)/<br/>sign-in · sign-up"]
        Tabs["(tabs)/"]
        QuestDetail["quest/[id]"]
        Submit["submit/[questId]"]
        Settings["settings · edit-profile · legal"]
    end

    subgraph TabsScreens["Tab screens (5 visible + map)"]
        Explore["index — Explore<br/>hero cards + player card"]
        Feed["feed — Quests tab<br/>map preview + activity feed"]
        Rankings["leaderboard — Podium + chasers"]
        Badges["badges — Collection grid"]
        Profile["profile — Stats + recent activity"]
        Map["map — Full map (hidden tab)"]
    end

    subgraph Hooks["hooks/"]
        useAuth["useAuth"]
        useQuests["useQuests"]
        useLocation["useLocation"]
        useActivityFeed["useActivityFeed"]
        useUserCompletions["useUserCompletions"]
    end

    subgraph Components["components/"]
        QuestHeroCard["QuestHeroCard"]
        PlayerCard["PlayerCard"]
        FeedPostCard["FeedPostCard"]
        Podium["Podium"]
        AppHeader["AppHeader"]
        Legacy["QuestCard · XPBar · BadgeGrid · …"]
    end

    Root["_layout.tsx<br/>auth guard"] --> Auth
    Root --> Tabs
    Root --> QuestDetail
    Root --> Submit
    Root --> Settings

    Tabs --> TabsScreens
    TabsScreens --> Hooks
    QuestDetail --> Hooks
    Submit --> Hooks
    Hooks --> Lib["lib/constants · types · supabase"]
    TabsScreens --> Components
```

## Activity feed data flow

```mermaid
sequenceDiagram
    participant Feed as feed.tsx
    participant Hook as useActivityFeed
    participant SB as Supabase
    participant RLS as RLS policy 008

    Feed->>Hook: mount
    Hook->>SB: SELECT completions (approved)
    Note over SB,RLS: status = 'approved' visible to all authenticated users
    SB->>Hook: photo_url + profile + quest join
    Hook->>Feed: FeedPost[]
    Feed->>Feed: render FeedPostCard list
```

Requires migration `008_public_feed_completions.sql`.

## Geofence system (migrations 013–015)

Four zone types, all enforced **server-side** by a `BEFORE INSERT` trigger on `completions` — the mobile client's "inside quest zone" indicator is advisory UX only.

| Type | Meaning | Validation |
|---|---|---|
| `none` | Submit from anywhere (home/reflective quests) | Always passes |
| `circle` | Radius around a point (50–2000 m) | `ST_DWithin` + GPS-accuracy buffer (≤30 m) |
| `city` | Anywhere inside the city boundary | `ST_Covers` against `cities.boundary` |
| `polygon` | Hand-drawn perimeter (admin ✏️ Draw mode) | `ST_DWithin` against `quests.boundary` + accuracy buffer |

Shape data flows to clients via the generated `quests.boundary_geojson` column (plain `select *`, no RPC). The admin writes boundaries through the validated `set_quest_boundary()` function (3–100 vertices, 400 m²–250 km², self-intersection repair). Client-side mirror logic lives in the shared `packages/geofence` package (44 tests).

## Core quest flow (today → target)

**Today:** manual admin approval after geofence-validated insert. **Target (Specs [02](docs/specs/02-instant-verification.md) + [03](docs/specs/03-report-moderation.md)):** geofence pass = proof; rewards on insert; community reports + admin moderation replace the approval queue.

```mermaid
sequenceDiagram
    actor Player
    participant Mobile as Mobile App
    participant Geo as @quest/geofence + expo-location
    participant Camera as expo-camera
    participant SB as Supabase
    participant GeoTrig as check_completion_geofence (013–015)
    participant Reward as apply_completion_rewards
    participant Feed as Activity feed (008)

    Player->>Mobile: Browse quests (Explore / map)
    Mobile->>SB: SELECT active quests
    Player->>Mobile: Open quest detail → Submit proof
    Mobile->>Geo: Client geofence pre-check (advisory)
    Mobile->>Camera: In-app capture only
    Mobile->>SB: Upload proof-photos + INSERT completion

    SB->>GeoTrig: BEFORE INSERT — server geofence gate
    alt Outside zone
        GeoTrig-->>Mobile: INSERT rejected
    else Inside zone
        Note over SB: Today: status pending → admin approves later<br/>Target (016): auto-approved on insert
        SB->>Reward: XP + level + streak (+ redemption code if sponsored)
        Reward->>SB: profiles.total_xp → badge trigger (005)
        Mobile->>Player: Celebration with real XP / streak (Spec 02)
        SB->>Feed: Approved completion (unless feed opt-out — Spec 03)
        Note over Feed: Reports → moderation queue → remove revokes XP (Spec 03)
    end

    Player->>Mobile: Rankings / Feed / Badges
    Mobile->>SB: leaderboard view + approved completions
```

Spec reference: full target flow and migration `016` in [02-instant-verification.md](docs/specs/02-instant-verification.md).

## Planned systems (spec map)

| System | Spec | Touches |
|---|---|---|
| Instant verification | [02](docs/specs/02-instant-verification.md) | `completions` insert path, mobile celebration, admin queue → log |
| Reports & moderation | [03](docs/specs/03-report-moderation.md) | `FeedPostCard`, `/moderation`, feed RLS, `removed` status |
| Analytics | [04](docs/specs/04-analytics-instrumentation.md) | `lib/analytics.ts`, PostHog in `_layout.tsx` |
| Content engine | [05](docs/specs/05-community-quests.md) | `quest_suggestions`, weekly drops (012), `quest_chains` |
| Growth & engagement | [06](docs/specs/06-growth-engagement.md) | duo parties, recap share card, `xp_events`, offline queue |
| Merchant redemption | [07](docs/specs/07-merchant-redemption.md) | `/redeem/[merchantKey]`, `sponsors`, `redeemed_at` |

Index and dependency order: [docs/specs/README.md](docs/specs/README.md). Product rationale: [PRODUCT.md](PRODUCT.md), phase plan: [ROADMAP.md](ROADMAP.md).

## Folder tree

```
Quest!/
├── apps/
│   ├── mobile/              Expo app (player-facing)
│   │   ├── app/(tabs)/      index, feed, leaderboard, badges, profile, map
│   │   ├── components/      QuestHeroCard, PlayerCard, Podium, FeedPostCard, …
│   │   ├── hooks/           useAuth, useQuests, useActivityFeed, …
│   │   └── lib/             constants.ts, types, supabase (+ analytics.ts — Spec 04)
│   └── admin/               Next.js dashboard
│       └── app/             completions, quests, users, sponsors
│                            (+ moderation, suggestions, redeem — specced)
├── packages/
│   └── geofence/            @quest/geofence — shared client geofence logic (44 tests)
├── docs/specs/              01–07 feature specs (instant verification era)
├── Gamified City Challenge App/   Figma Make web prototype
├── tokens/                  Shared CSS design tokens
├── DESIGN.md                Harbour Electric design system
├── PRODUCT.md               Product positioning, content engine, safety
├── ROADMAP.md               Phase plan and status
└── supabase/
    ├── migrations/          001–015 (PostGIS geofence 013–015)
    ├── functions/           award-xp, generate-redemption-code, snapshot-ranks
    └── seed.sql
```

## Design system alignment

| Layer | Location |
|-------|----------|
| Spec | `DESIGN.md` |
| Mobile tokens | `apps/mobile/lib/constants.ts` |
| Web prototype tokens | `Gamified City Challenge App/src/styles/theme.css` |
| Shared CSS | `tokens/colors.css`, `typography.css`, `shadows.css` |

Prior spec (**Saltwater Saturday**, indigo `#6366F1`, 4-tab layout) is superseded as of June 2026 Figma reimagining.

## Analytics data flow (Spec 04 — planned)

```mermaid
flowchart LR
    subgraph Mobile["apps/mobile"]
        Screens["Screens + hooks"]
        Wrapper["lib/analytics.ts"]
        PH["posthog-react-native"]
    end

    Screens --> Wrapper
    Wrapper -->|"track / identify"| PH
    PH --> PostHog["PostHog cloud"]
    PostHog --> Dash["4 dashboards:<br/>activation · WAU · week-2 · content"]
```

No server-side event forwarding in v1. Sponsor redemption counts come from Postgres (Spec 07), not PostHog.

## Moderation data flow (Spec 03 — planned, ships with Spec 02)

```mermaid
sequenceDiagram
    participant Player
    participant Feed as FeedPostCard
    participant SB as Supabase
    participant Admin as /moderation

    Player->>Feed: ⋯ → Report (reason)
    Feed->>SB: INSERT completion_reports
    Note over SB: ≥3 distinct reporters → hidden_pending_review
    Admin->>SB: Review GPS evidence + photo
    alt Dismiss
        Admin->>SB: reports → dismissed, post restored
    else Remove
        Admin->>SB: status → removed
        SB->>SB: revoke_completion_rewards (Spec 02)
    end
```

Feed privacy opt-out (complete without public feed) and block-user filtering live in the same spec.
