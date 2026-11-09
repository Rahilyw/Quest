# UI/UX Overhaul Plan: Cutouts

Implements [BRAND.md](BRAND.md) in the mobile app, then admin. Each phase ships on its own,
so the app is never half-migrated for long.

---

## Decisions to confirm before Phase 1

| # | Decision | Recommendation |
|---|---|---|
| D1 | Real photographed cutouts, one per quest (~29) | Yes. The direction depends on them; drawn stand-ins aren't shippable |
| D2 | Tabs: This week, Quests, City, Rankings, You (avatar). Badges move into You | Yes |
| D3 | One colour per category, used on every surface for that category | Yes |
| D4 | Keep Pilowlava for the wordmark only; Figtree for all interface text | Yes |
| D5 | Replace difficulty (Easy / Medium / Hard) with distance and time | Yes, two optional quest columns (`distance_m`, `duration_min`) |
| D6 | Dual-camera proof: the place, then a quick selfie shown as a corner pillow | **Approved Nov 7, 2026.** Selfie is skippable; see Phase 2 step 7 and 3e |
| D7 | A real place photo for every quest (~29), alongside its cutout | Yes. `cover_image_url` already exists; this replaces the Unsplash placeholders |
| D8 | A sprite set (~12 Victoria creatures and weather) and a scrap kit (tape, torn paper, pen marks) | Yes. Commission one illustrator or 3D artist for one consistent style; Lottie or Rive for the idle loops |

## Implementation status (Nov 9, 2026)

Cursor has completed several redesign increments on the `cursor/cutouts-this-week-quests`
branch. Its work is already in the current checkout; treat the code as the starting point and
continue from it rather than reimplementing these phases. The latest commits are `ed70048`
(foundation, cutout components, This week and Quests), `55bc433` (quest detail and photo
viewer), `86fb7de` (camera submission and celebration), and `c5e4ecb` (City/feed, Rankings,
You, comments, reports and notifications). These commits are ahead of `main` in this checkout.

| Plan area | Current state in the Cursor branch | Remaining work |
|---|---|---|
| Phase 1: Foundation | Implemented: `lib/theme.ts`, Figtree and text primitives, category tokens, token lint script. | Continue reducing the existing token-lint backlog and audit remaining screens when touched. |
| Phase 2: Cutout pipeline | Implemented in code: migrations 032–033, processing script, mobile cutout/photo components, signed private selfie access, and admin cutout uploader. | Migrations 032–033 remain local until verified/applied remotely; real category/quest cutout assets are still needed. |
| Phase 3: Core loop | This week, Quests, quest detail/photo viewer, in-app place/selfie camera, Verified celebration, and camera ZoneMap are implemented. | Visual/device/backend verification remains; the map tab and a few motion/content details still need a Cutouts audit. |
| Phase 4: Social and status | City/feed bubbles, Rankings, You, comments, reports and notifications are redesigned. | Continue accessibility and device checks; signed selfies are not wired into every feed/celebration surface. |
| Phase 5: Brand surfaces | Share card, onboarding, app/adaptive icons and splash implemented (Claude, Nov 8). | Store screenshots on the `desk` grid need real screens and content; verify native assets in device builds. |
| Phase 6: Admin dashboard | Cutouts restyle and quest cutout uploader implemented (Claude, Nov 8). | Live folder/bubble preview remains; verify all admin pages for visual consistency and device-independent layouts. |
| Phase 7: Content | Founder-owned and ongoing. | Real place photos, processed cutouts, action phrases, sprite artwork and copy remain. |

This snapshot is a codebase observation, not a claim that the Cursor commits have been merged
to `main`, deployed, or that migrations 032–033 have been applied to Supabase. Recheck branch state,
the working tree and migration status before making changes. Use
[the Claude next-implementation prompt](CLAUDE-NEXT-IMPLEMENTATION-PROMPT.md) as the task
handoff; update this snapshot as work lands so later agents do not duplicate Cursor's work.

**Feature handoff update (Nov 9, later the same day):** Spec 05 and Spec 07 are implemented
on this branch. Migrations `034`, `035`, and `036` are local and were not applied. Monday
push was not deployed. Merchant redemption was not tried at a counter. Quest chains stay
deferred. The next product feature is Spec 06, starter quest first, then the other Spec 06
slices one at a time. The earlier Nov 9 audit note described the checkout before this work.

**Feature handoff update (Nov 9, earlier):** the redesign work has advanced since the Nov 8 notes
below. At that point the next priority was Spec 05. That audit is historical. See
[ROADMAP.md](../../ROADMAP.md).


### Claude session, Nov 8, 2026 (follow-up on the Cursor branch)

Audit: the Cursor work above is present as described. Two Phase 2 gaps were confirmed and
closed in this increment; nothing Cursor built was rewritten.

- **Private selfie delivery.** New local migration `033_selfie_signed_url_access.sql`
  adds a storage SELECT policy on `proof-selfies` backed by `can_view_selfie_object()`,
  which reuses `can_view_completion()` (own post, or approved + not hidden + feed public +
  no block) and requires the object to sit in the completion owner's folder. Mobile signs
  with the viewer's own session (`lib/selfieUrl.ts`, 5 min URLs, cached); `PhotoViewer`
  uses `useSignedSelfie`. No service-role key reaches mobile, the bucket stays private,
  and a failed signature just hides the optional selfie, never the place photo.
- **Admin cutout uploader.** `setQuestCutout` server action (admin-only, transparent WebP
  from `scripts/make-cutout.js`, 1.5 MB cap, old object cleaned up) and
  `QuestCutoutUploader` in the quest edit form, previewing on all five category colours.

Checks: mobile `tsc --noEmit` clean; mobile `npm test` 159/159; admin `tsc --noEmit` clean;
`lint:tokens` still reports the existing warning-level backlog (336 raw tokens in 36 files,
none newly introduced here). Not run: anything against a real Supabase (migrations 032 and
033 are not applied), device testing of the signed-URL flow.

**Share card (Phase 5, second Claude increment).** `ShareCompletionCard` and 
`ShareStoryModal` rebuilt on tokens: the quest's category colour fills the 9:16 card, the 
proof photo is a tilted white-edged `Pillow`, the quest's `Cutout` overlaps its corner, 
ink `+XP` pill, Pilowlava wordmark, sentence case, no emoji. `ShareCompletionData` gained 
optional `category` and `cutoutUrl`; all four call sites (celebration, City bubble, 
completion page, legacy `FeedPostCard`) pass them. The completion page query now selects 
`category, cutout_url`. Share files are off the token-lint list (336 to 312 raw tokens). 
Not verified on a device: the view-shot capture of the new card and the cutout placeholder 
look. The selfie is not on the share card; feed bubbles do not show selfies yet, so the 
earlier "not yet wired" note below only applies if a feed surface starts showing them.

**Onboarding (Phase 5, third Claude increment).** `app/onboarding.tsx` rewritten as three 
paper screens, one sentence each, with three category-colour `Cutout` placeholders per 
screen and the seal sprite on the first. Ink pill button, dot progress, 48pt targets, 
curly apostrophes, no arrows or emoji. The city picker is gone (Victoria is the only pilot 
city, so `completeOnboarding` always gets `CITY.name`); `lib/onboarding.ts` is unchanged. 
`OnboardingVisuals.tsx` (old illustrations) is deleted. Cutouts stay placeholders until 
Phase 7 supplies category defaults. Not verified on device or at 130% text / small Android.

**Icon and splash (Phase 5, fourth Claude increment).** `scripts/gen-app-icons.js` rewritten 
(it still described Harbour Electric): it now renders the real Pilowlava glyphs (outlines in 
`scripts/data/pilowlava-glyphs.json`, extracted from the bundled OFL font) with `sharp`. 
`icon.png` is ink `Q!` on a sunflower field, `adaptive-icon.png` is the mark inside the 
Android safe circle (adaptive background `#FFCE1F`), `splash.png` is the ink `Quest!` 
wordmark on paper (`splash.backgroundColor` `#F6F2EC`). Notification tint is now sunflower. 
The glyphs are all-caps because Pilowlava is a caps display face. Assets are regenerated 
and checked visually as flat renders only; not tested in a dev build, on iOS icon masking 
or a real Android launcher. Needs a native build to take effect (icon and splash are not 
OTA-updatable).

**Admin restyle (Phase 6, fifth Claude increment).** `apps/admin/lib/theme.ts` and 
`app/globals.css` moved from the navy Harbour Electric palette to Cutouts on paper: paper 
background, white surfaces, ink text, ink pill buttons (no glow), Figtree instead of Inter, 
sentence-case labels, and the mobile category colours (with `deep` and `onColor`) so 
category chips read as bright fills with ink text. Sidebar is an ink-pill active state with 
a Pilowlava `Quest!` wordmark and no emoji. Login, reset and auth screens now use theme 
tokens instead of raw hex. Emoji and symbol prefixes removed from the quest list, geofence 
editor, sponsors and badges button (badge icons are user data and stay). Only 
`lib/badge-rules.ts` rarity colours remain as raw hex, and they are tuned for a dark 
background. Checks: admin `tsc --noEmit` clean; `/login` returns 200 with the new colours 
in a dev server. Not run: `next build`, authenticated pages in a browser (the in-app 
browser could not open localhost this session), a contrast audit. A dev server may still 
be running on port 3011 from this check.

**Core-loop audit (Claude, Nov 8).** Read This week, Quests, quest detail, submit and the 
Verified screen against BRAND.md sections 7, 8b and 11. Fixed: Start quest is now disabled 
outside the zone (8b), with the zone line as its accessibility hint; place photo has a real 
alt text instead of "Photo: Quest!"; the Quests tab no longer shows "Nothing in Victoria 
yet" when the load failed (it shows a retry) and supports pull to refresh; raw database 
error text is no longer shown in submit alerts; camera-permission copy names the app and 
the two photos; the selfie countdown is a polite live region; the XP pill and Verified 
sentence have screen-reader labels and roles. Audited and fine: This week sentence 
(separate pressable phrases, refresh, error, empty), zone chip states and copy, shutter 
disabled outside the zone, selfie skip, celebration copy and reduced-motion path.
**Gaps found, not fixed:** (1) the camera screen has no small zone map with the dashed 
geofence polygon (spec 7, The zone); (2) the cutout does not fly into the You avatar after 
landing, and Verified has no new-rank pill; (3) "Photos from here" rows lack the time 
(name and hearts only); (4) the camera hint is generic, per-quest framing hints need a 
column; (5) upload-failure copy cannot promise "you're still verified" because the 
completion is only created after both uploads, so a retry queue would be needed; (6) no 
skeleton loaders for folders and bubbles (text loading states); (7) nothing was exercised 
on a device, at 130% text, or against a real backend, so contrast, touch targets and the 
geofence edge cases are code-read only.

**Zone map (Claude, Nov 8, follow-up to the audit).** New `components/ZoneMap.tsx` draws the 
quest's real geofence on a small 112 pt map on the camera screen during the place shot: 
circle, polygon, multi-area or the city boundary, dashed in the category's deep colour with 
a 35% category fill and an ink player dot, hidden from screen readers (the zone chip carries 
the status) and not shown for anywhere quests or during the selfie. Audit gap (1) is closed. 
Unverified: it type-checks but has not been run on iOS or Android; `liteMode` (Android only) 
and `lineDashPattern` rendering, Google Maps key setup and the fit-to-zone behaviour need a 
device check. The Map tab (`app/(tabs)/map.tsx`) still uses the old palette and 
`CATEGORY_COLORS`; it was not part of this increment.

**Still open / next:** apply and verify 032+033 on a staging project, then test selfie
signing across own / follower / blocked / hidden cases; feed bubbles and celebration for
other users' selfies are not yet wired to `useSignedSelfie`; Phase 5 (icon, splash, share
card, onboarding) is the next recommended phase, then Phase 6 admin restyle (the admin
still uses the old navy palette; the uploader is unstyled by design). Category default
cutouts and all Phase 7 content remain founder work.

---

## Phase 1: Foundation (2–3 days)

No visible redesign yet; this makes the rest cheap and safe.

1. **`lib/theme.ts`** with the BRAND.md §12 tokens. The old `COLORS` export becomes a thin
   alias onto the new tokens so nothing breaks while screens migrate.
2. **Fonts.** Add `@expo-google-fonts/figtree` to `FontProvider`; keep Pilowlava Regular.
   Remove Space Grotesk, Pilowlava Atome, BispoNova and Skyscapers.
3. **Text primitives** (`Title`, `Sentence`, `Heading`, `Body`, `Name`, `Small`, `Micro`),
   each bound to one `TYPE` token. Components stop setting `fontSize` directly.
4. **Category model.** `CATEGORY` (colour, deep shade, text colour, label, icon) replaces
   `CATEGORY_COLORS`, `CATEGORY_SOFT`, `CATEGORY_ICONS`, `CATEGORY_TAGS`. Emoji icons go.
5. **Icons.** One line set (Phosphor, or the Ionicons outline set already bundled).
6. **Lint guard.** Ban hex literals and `fontSize` outside `lib/theme.ts` and the primitives.
   Warning now, error at the end of Phase 4.
7. **Copy pass.** Sentence case everywhere, remove `·` meta strings and `→` from buttons, fix
   `1 days left`, curly quotes, `…`, non-breaking spaces between numbers and units. Update
   the tests in `__tests__/logic.test.js` that assert uppercase strings.

**Done when:** the app looks nearly the same, but every colour, font and radius comes from
tokens.

---

## Phase 2: Cutout pipeline (2–3 days)

The screens in Phase 3 need cutouts to exist, so this comes first.

1. **Migration `032`** (031 is the Nov audit migration)**:** `quests.cutout_url text null`; public `quest-cutouts` storage bucket
   with admin-only writes (same pattern as quest covers, migration 010).
2. **Processing script** `scripts/make-cutout.js` (sharp): takes a PNG with transparency,
   trims, pads 8%, resizes to 600px, bakes the shadow from BRAND.md §6, writes WebP with
   alpha. Background removal is done before this step (remove.bg, Photoshop or the iOS
   Photos "lift subject" feature); the script rejects images without an alpha channel.
3. **Admin:** cutout upload on quest create/edit, with a live preview on each category colour.
4. **Default cutouts:** one per category, so every quest has something before its own photo
   exists.
5. **Mobile `<Pillow>` component:** `react-native-svg` clip path from BRAND.md §6a over an
   image, with ink or warm-white edge, used for every proof photo.
6. **Quest photos query:** `useQuestPhotos(questId, limit)` returning the latest public,
   unblocked, non-hidden completions for one quest, plus a weekly count. Reuses the feed's
   RLS, so privacy rules apply automatically; add an index on
   `completions (quest_id, completed_at desc)` if the plan shows a sequential scan.
7. **Dual-camera proof data (D6), in migration `032`:**
   - `completions.selfie_url text null`.
   - **Selfies are faces, so don't put them in a public bucket.** Today `proof-photos` is
     read through `getPublicUrl`, so anyone with a link can open a file even if the post
     is hidden or opted out of the feed. Store selfies in a private `proof-selfies` bucket
     and serve them with short-lived signed URLs, issued only when the viewer is allowed to
     see the completion (same check as the feed RLS: `can_view_completion`, migration
     027). Consider moving place photos to the same model later.
   - Extend `delete_own_account()` (migration 023) to include the `proof-selfies` bucket;
     today it only clears `proof-photos` and `avatars`.
   - Moderation (`apps/admin/app/moderation`) shows both photos; removing a completion
     deletes both files.
8. **Collage kit components (D8):**
   - `<Sprite name="seal" />` wrapping `lottie-react-native` (works in Expo), autoplaying 3
     loops then holding the last frame; a still PNG under reduce motion. A tiny registry
     enforces one animated sprite per screen.
   - `react-native-svg` scraps: `<Tape>`, `<TornLabel>`, `<PenRing>`, `<PenArrow>`,
     `<PenUnderline>`, `<Sparkle>`, all hidden from screen readers.
   - Placeholder sprites (simple vector seal, gull, cloud) until the commissioned set lands.
9. **Mobile `<Cutout>` component:** loads `cutout_url` or the category default, sizes by role
   (inline, folder, row, breakout, collection, celebration), sets the accessible label.

**Done when:** every quest renders a cutout (its own or its category's) in a test screen.

---

## Phase 3: Core loop (6–8 days)

The screens a new player sees in their first five minutes.

### 3a. Floating tab bar and new tabs
New `QuestTabBar`: white pill with four icon buttons (This week, Quests, City, Rankings),
ink pill for the active one, avatar circle beside it for You. Delete `TabIconArt.tsx`,
`TAB_THEMES` and the `BlurView`. Routes: `index` → This week, new `quests`, `feed` → City,
`leaderboard`, `profile` → You.

### 3b. This week (dark)
```
 This week                Nov 7
                        Friday
 Hi, Ella! This week you could
 [cup] grab a flat white at Moss
 Street, run Dallas Road [shoe],
 ride a harbour ferry [ferry] and
 get [cone] soft-serve at Beacon
 Drive-In.
 (o)(o)(o) Picked from 4 quests near you
╭──────────────────────────────╮
│ From the city:       12 today│
│ (J) Jordan finished:   [shoe]│
│     …ran Dallas Road, 24 min │
│ (E) You finished:       [cup]│
╰──────────────────────────────╯
```
- `lib/thisWeek.ts` picks up to four quests (nearest unplayed, newest drop, expiring soon,
  one a friend did) and builds the sentence from short per-quest phrases
  (`quests.action_phrase`, e.g. "grab a flat white", added in migration `032`).
- Inline cutouts use nested `<Image>` inside `<Text>`, which React Native supports on both
  platforms; each bold phrase is its own pressable span.
- The sheet reuses the activity feed hook, limited to three rows.
- Your rank and XP move to a compact row at the top of the sheet.

### 3c. Quests (folders)
Two-column `Folder` grid by category, then a category screen listing that category's quests
as rows (cover photo, name, distance and time, XP pill, cutout). One breakout cutout on the
grid, from the newest quest.

### 3d. Quest page and photo viewer
Per BRAND.md §7: the place photo full-bleed on top with the corner stack of the latest three
proof pillows and the cutout overlapping its bottom edge; title, facts and zone line; the
`Photos from here` row ending in your empty slot; one sticky ink `Start quest` button.
Tapping the stack or a pillow opens the dark viewer (swipe through, react, `Start this
quest`). Sponsored quests show the sponsor and reward in one tangerine row.
If D6 is approved, the camera captures the place, then a selfie, and the viewer and feed
show the selfie as a corner pillow.

### 3e. Submit and celebration
**Camera (D6).** Replace `ImagePicker.launchCameraAsync` in `app/submit/[questId].tsx` with an
in-app `expo-camera` `CameraView`, so the app can switch from the back camera to the front
camera on its own (the system camera picker can't do this reliably on Android). Flow:
place shot with the zone chip on screen → automatic flip → 3-second countdown → selfie, with
`Skip selfie` always available → upload both, place photo first. If the selfie upload fails,
the completion still goes through with `selfie_url` empty. Mock-location blocking and the
in-app-camera-only rule still apply.

The zone chip (BRAND.md §8b) appears on quest detail and the camera screen, with all four
states: checking, inside, outside with distance and direction, no location permission. The
zone map draws the real geofence polygon (`boundary_geojson`) dashed in the category colour.
The celebration is the Verified screen (BRAND.md §7), drenched in the quest's colour and
the one orchestrated motion moment (§8): the cutout lands, XP counts up, the cutout flies
into your avatar.

**Done when:** a new player can sign up, find a quest, complete it and see the celebration
without meeting an old-style screen.

---

## Phase 4: Social and status (4–5 days)

| Screen | Changes |
|---|---|
| City | Speech-bubble feed (`FeedBubble`) in category colours, overlapping, earlier on top. Each bubble leads with the square proof photo and the avatar on its corner. The map preview sits above the feed with category-coloured pins; tapping opens the full map |
| Rankings | Title + count; top three as large avatars with cutouts of their latest quests; list rows below; your row pinned at the bottom when off-screen |
| You | Avatar, name, level, streak; two shelves: **Cutouts** (one per completed quest, locked ones greyed with how to earn them) and **Badges**; settings and edit-profile links |
| Comments, report, notifications | Paper sheets, `sheet` radius, text rows, one ink action |

**Done when:** no screen uses the old palette; the lint guard becomes an error.

---

## Phase 5: Brand surfaces (2–3 days)

- App icon and adaptive icon: the Pilowlava `Q!` on a sunflower field
  (`scripts/gen-app-icons.js` updated).
- Splash: paper background, Pilowlava wordmark.
- Share card (`ShareCompletionCard`, `ShareStoryModal`): the proof photo, the quest's cutout
  overlapping it, the category colour as the background, `+150 XP` pill, small wordmark.
  This is the most-seen brand surface outside the app.
- Onboarding: three screens, each one sentence with cutouts, on paper.
- Store screenshots built from real screens on the `desk` grid background.

---

## Phase 6: Admin dashboard (3 days)

Same tokens as CSS custom properties in `apps/admin/app/globals.css`. Admin stays dense
and quiet: Figtree throughout, category colours only as small dots and chips, ink buttons.
The quest form gets the cutout uploader and a live folder/bubble preview.

---

## Phase 7: Content (ongoing, owner: founder)

- Photograph and process ~29 cutouts (BRAND.md §6). Suggested order: the eight quests on This
  week most often, then the rest by category.
- Photograph every quest location (BRAND.md §6a) and replace every Unsplash cover.
- Commission the sprite set and scrap kit (BRAND.md §6b): seal (idle, dozing), gull
  (perched, flying), crow, raccoon, rain cloud, sun, fog, plus tape and paper textures.
- Write an `action_phrase` for every quest ("ride a harbour ferry").
- Rewrite descriptions to the voice in BRAND.md §9.

---

## Quality bar for every phase

- Contrast per BRAND.md §3; no text below 4.5:1.
- Tap targets at least 48pt; overlapping elements keep a clear top-to-bottom reading order.
- Works at 130% text size and with reduce motion on.
- Every cutout and image has a text alternative; decorative icons are hidden from screen
  readers.
- Screenshots on a small Android (360dp) and a large iPhone before merging.
- Copy read aloud once: if it sounds like an app, rewrite it to sound like a person.

## Files most affected

`lib/constants.ts` → `lib/theme.ts`, `components/FontProvider.tsx`, `QuestTabBar.tsx`,
`TabIconArt.tsx` (deleted), `QuestHeroCard.tsx` (replaced by `Folder` and quest rows),
`PlayerCard.tsx`, `CategoryChip.tsx`, `AppHeader.tsx`, `FeedPostCard.tsx` (→ `FeedBubble`),
`Podium.tsx`, `CompletionCelebration.tsx`, `ShareCompletionCard.tsx`, `EmptyState.tsx`, all of
`app/(tabs)/`, `app/quest/[id].tsx`, `app/submit/[questId].tsx`, `scripts/gen-app-icons.js`,
new `components/Cutout.tsx`, `lib/thisWeek.ts`, `scripts/make-cutout.js`,
`supabase/migrations/032_quest_cutouts.sql`.
