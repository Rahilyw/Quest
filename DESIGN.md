---
name: Quest!
description: Real life, gamified. A weekly city challenge app.
colors:
  quest-sky: "#E8F3FF"
  quest-sky-deep: "#C4DBFF"
  quest-sky-soft: "#D6E9FF"
  glass-white: "#FFFFFF"
  glass-lifted: "#F8FAFF"
  navy: "#0D1B3E"
  navy-mid: "#1a2d6d"
  slate-muted: "#6B7FA3"
  quest-blue: "#4364F7"
  quest-blue-light: "#6B8EFF"
  city-orange: "#FF6B35"
  trail-green: "#22C55E"
  social-purple: "#A855F7"
  vendor-orange: "#F97316"
  community-blue: "#3B82F6"
  harbour-teal: "#06B6D4"
  market-amber: "#F59E0B"
  danger-red: "#EF4444"
typography:
  brand:
    fontFamily: "Pilowlava"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1.05
  display:
    fontFamily: "Space Grotesk"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Space Grotesk"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Poppins (web) / System (mobile)"
    fontSize: "16px"
    fontWeight: 900
    lineHeight: 1.3
  body:
    fontFamily: "Poppins (web) / System (mobile)"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Poppins (web) / System (mobile)"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.quest-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "12px 16px"
  category-chip-active:
    backgroundColor: "{colors.navy}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
  quest-hero-card:
    backgroundColor: "{colors.glass-white}"
    imageHeight: "176px"
    rounded: "{rounded.xxl}"
    shadow: "0 8px 16px rgba(13,27,62,0.12)"
  player-card:
    backgroundColor: "{colors.quest-blue}"
    rounded: "{rounded.xl}"
    gradient: "linear-gradient(135deg, #4364F7, #6B8EFF)"
  tab-bar-active-pill:
    backgroundColor: "{colors.quest-blue}"
    size: "48px"
---

# Design System: Quest!

## 1. Overview

**Creative North Star: "Harbour Electric"**

Victoria on a Saturday afternoon — the Inner Harbour is busy, the sky is wide and blue, and everyone's checking their phone to see who's leading the week. The UI should feel like a city game show: bold type, photo proof, a leaderboard that actually matters, and enough energy to pull you outside without looking like a cartoon fitness app.

This direction replaces the prior **Saltwater Saturday** glass-minimal spec (June 2026). The Figma reimagining shifts Quest! toward an image-led, social-first layout: hero quest cards, a public activity feed, a podium rankings screen, and a dedicated badges tab.

**Key characteristics:**
- Sky-blue canvas (`#E8F3FF`) with white cards floating above it
- **Quest Blue** (`#4364F7`) as the primary brand and interactive accent
- **City Orange** (`#FF6B35`) for city badge, notifications, and featured callouts
- **Navy** (`#0D1B3E`) for primary text and dramatic section headers (Rankings, Profile hero)
- Image-first quest cards with gradient overlays and difficulty pills
- Five-tab navigation with animated active pill on the tab bar
- Weight-driven hierarchy: 900 for brand/headlines, 700 for labels, 400 for body

**Anti-references (unchanged):** no AR neon (Pokémon GO), no cartoon theater (Duolingo), no performance-data density (Strava), no coupon visual language (loyalty apps).

**Source of truth in code:**
- Mobile tokens: `apps/mobile/lib/constants.ts`
- Web prototype tokens: `Gamified City Challenge App/src/styles/theme.css`
- Shared CSS tokens: `tokens/colors.css`

## 2. Colors

### Backgrounds
- **Quest Sky** (`#E8F3FF`): Primary app background. Every tab screen starts here.
- **Quest Sky Deep** (`#C4DBFF`): Desktop/web frame background outside the phone shell.
- **Quest Sky Soft** (`#D6E9FF`): Chip backgrounds, subtle fills.

### Surfaces
- **Glass White** (`#FFFFFF`): Cards, tab bar, feed posts, badge tiles.
- **Glass Lifted** (`#F8FAFF`): XP track, secondary section backgrounds.

### Text
- **Navy** (`#0D1B3E`): Primary text, active filter labels on light bg.
- **Slate Muted** (`#6B7FA3`): Descriptions, metadata, inactive tab labels.

### Brand accents
- **Quest Blue** (`#4364F7`): Primary CTA, XP badges on cards, active tab pill, player card, links.
- **Quest Blue Light** (`#6B8EFF`): Gradient partner on player card and primary buttons.
- **City Orange** (`#FF6B35`): City pill in header, notification dot, "New" badges, sponsor highlights.

### Category signals (identification only)
- **Trail Green** (`#22C55E`): Fitness
- **Social Purple** (`#A855F7`): Social
- **Vendor Orange** (`#F97316`): Food
- **Community Blue** (`#3B82F6`): Community
- **Harbour Teal** (`#06B6D4`): Nature

Category colours appear on map pins, difficulty context, and category tags — never as the primary brand accent.

### Status
- **Success** (`#22C55E`): Approved XP, easy difficulty, live map dot.
- **Warning** (`#F59E0B`): Medium difficulty.
- **Danger** (`#EF4444`): Hard difficulty, errors.

### Named rules
**The Quest Blue Rule.** Quest Blue should feel intentional, not decorative. Reserve it for brand moments, CTAs, active states, XP earned values, and the player progress card. If a screen feels flat, fix hierarchy and photography before adding more blue.

**The Category Independence Rule.** Category colours identify quest type. They are never substituted for Quest Blue on interactive chrome.

**The Photo-First Rule.** Explore and Feed are image-led. Category placeholder images live in `CATEGORY_IMAGES` until per-quest cover art exists in the database.

## 3. Typography

**Pilowlava** (SIL OFL 1.1) for the `Quest!` brand wordmark only. **Space Grotesk** for readable UI display titles (quests, sections, badges). **Poppins** on web prototype UI. System font stack on mobile for body, buttons, and forms.

| Role | Font | Size | Usage |
|------|------|------|-------|
| Brand | Pilowlava | 30–48px | `Quest!` wordmark, auth logo |
| Display title | Space Grotesk Bold | 18–42px | Quest hero + detail titles, section headers, badge names |
| Headline | System / Poppins | 14–16px | Tab labels, dense UI headers |
| Body | System / Poppins | 12–13px | Descriptions, captions |
| Label | System / Poppins | 10–11px | Pills, XP values, difficulty |

Font files live in `apps/mobile/assets/fonts/` (bundled via `FontProvider`). Web/admin use `tokens/typography.css` and `apps/admin/public/fonts/`.

## 4. Elevation

Cards use soft navy-tinted shadows on white — not heavy glass specular lines.

| Token | Value | Usage |
|-------|-------|-------|
| Hero card | `0 8px 16px rgba(13,27,62,0.12)` | Quest hero cards |
| Feed card | `0 4px 12px rgba(13,27,62,0.08)` | Activity feed posts |
| Stat tile | `0 4px 12px rgba(13,27,62,0.06)` | Profile stats grid |

Rankings and Profile use **Navy** section headers as elevation — no shadow needed.

## 5. Navigation

Five tabs (mobile `app/(tabs)/_layout.tsx`):

| Tab | Route | Purpose |
|-----|-------|---------|
| Explore | `index` | Hero quest cards, player card, category filters |
| Quests | `feed` | Map preview + public activity feed |
| Rankings | `leaderboard` | Podium top 3, chasers list, featured badges |
| Badges | `badges` | Full badge collection with lock/earned states |
| Profile | `profile` | Navy hero, stats grid, recent activity |

**Map** (`map`) is hidden from the tab bar; opened from the feed map preview ("Explore map →").

**Tab bar:** white background, 72px height, active icon sits in a 48px Quest Blue circle pill elevated above the bar.

## 6. Screens & components

### App header
- `QUEST!` brand in Quest Blue, 900 weight
- City pill: City Orange bg, white text (`Victoria, BC`)
- Optional subtitle: week/season copy in Slate Muted
- Notification bell with orange badge count

### Player card (Explore)
- Quest Blue gradient background, white type
- Avatar, level title (`EXPLORER`, `LEGEND`, etc.), inline XP bar
- Today XP counter top-right

### Quest hero card (Explore)
- Full-width photo (176px) with navy gradient overlay
- Tag pill (category), XP badge (Quest Blue), title on image
- Body: description, difficulty pill (green/amber/red), "START QUEST" CTA

### Activity feed (Quests tab)
- Embedded map preview with quest pins; tap opens full map
- Feed posts: avatar, username, level chip, quest title, proof photo, time ago
- Data: `useActivityFeed` hook → approved completions (requires migration `008`)

### Rankings
- Navy hero: "THE CITY'S ELITE", podium for top 3
- Featured badges horizontal scroll
- "Upcoming chasers" list with rank, avatar, weekly XP
- "Boost Your Rank →" CTA

### Badges
- Collection summary card (Quest Blue)
- 2-column grid: emoji, name, description, lock overlay if unearned

### Profile
- Navy hero with avatar ring, XP/rank pills, level title
- 2×2 stats grid: Quests Done, Total XP, Badges, Best Rank
- Recent activity rows with category thumbnail

### Legacy compact quest card
`QuestCard.tsx` remains for contexts needing a list-row layout (e.g. quest detail adjacent UI). New discovery UX uses `QuestHeroCard.tsx`.

## 7. Do's and Don'ts

### Do
- Use hero photography on Explore; real proof photos on Feed
- Keep Rankings and Profile navy headers — they anchor the game-show energy
- Write copy as if someone who lives in Victoria wrote it
- Hold Quest Blue to meaningful interactive and brand moments
- Run migration `008_public_feed_completions.sql` before shipping the activity feed

### Don't
- Revert to the old 4-tab layout (Quests / Map / Ranks / Profile) without updating docs
- Use Quest Blue and City Orange interchangeably — orange is for city/featured, blue is for brand/CTA
- Show confetti or XP counters before admin approval
- Add Strava-style charts or segment breakdowns
- Design sponsor quests as coupons
