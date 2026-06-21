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
        DB["PostgreSQL + RLS"]
        Storage["Storage: proof-photos · avatars"]
        Edge["Edge Functions"]
        Migrations["migrations/001–008"]
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

## Core quest flow

```mermaid
sequenceDiagram
    actor Player
    participant Mobile as Mobile App
    participant GPS as expo-location
    participant Camera as expo-camera
    participant SB as Supabase
    participant Admin as Admin Panel
    participant Trigger as award_xp trigger

    Player->>Mobile: Browse quests (Explore / map)
    Mobile->>SB: SELECT active quests
    Player->>Mobile: Open quest detail
    Player->>Mobile: Submit proof
    Mobile->>GPS: Verify geofence
    Mobile->>Camera: Capture photo
    Mobile->>SB: Upload to proof-photos bucket
    Mobile->>SB: INSERT completion (status: pending)

    Admin->>SB: Review completions queue
    alt Approved
        Admin->>SB: UPDATE status → approved
        SB->>Trigger: on_completion_approved
        Trigger->>SB: profiles.total_xp + level
        Note over SB: Visible on activity feed (008)
    else Rejected
        Admin->>SB: UPDATE status → rejected
    end

    Player->>Mobile: Check Rankings / Feed
    Mobile->>SB: leaderboard view + approved completions
```

## Folder tree

```
Quest!/
├── apps/
│   ├── mobile/              Expo app (player-facing)
│   │   ├── app/(tabs)/      index, feed, leaderboard, badges, profile, map
│   │   ├── components/      QuestHeroCard, PlayerCard, Podium, FeedPostCard, …
│   │   ├── hooks/           useAuth, useQuests, useActivityFeed, …
│   │   └── lib/             constants.ts (design tokens), types, supabase
│   └── admin/               Next.js dashboard
├── Gamified City Challenge App/   Figma Make web prototype
├── tokens/                  Shared CSS design tokens
├── DESIGN.md                Harbour Electric design system
└── supabase/
    ├── migrations/          001–008
    ├── functions/           award-xp, generate-redemption-code
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
