# Quest! Brand & Design Specification

**Direction:** Cutouts
**Status:** Approved Nov 7, 2026. This is the source of truth for the app's look, feel and
copy. It replaces `DESIGN.md` ("Harbour Electric") and the "Summer 2026" palette in
`apps/mobile/lib/constants.ts`, which disagreed with each other.
**Visual reference:** the style sheet at https://claude.ai/artifact/6BnTZUaY7ZvTLN9hzZvFLj
(private; share it from its Share menu if others need it).

---

## 1. Why change

An audit of the shipping app (Nov 2026) found it was built almost entirely from defaults:

| What ships today | Problem |
|---|---|
| Tailwind's default palette, verbatim (`#0EA5E9`, `#22C55E`, `#A855F7`, `#EF4444`, `#0F172A`) | Looks like every Tailwind starter; nothing says Victoria |
| One radius (20–28px or pill) on 189 elements, soft shadow under each | No hierarchy; every element looks equally important |
| Five tabs with five gradients, motifs and a frosted glass bar | Noise; the blur washed out the whole screen on Android |
| ALL-CAPS labels (`START QUEST`, `ROOKIE`, `MEDIUM`), `·`-joined meta strings | Template chrome; hides bugs like `1 days left` |
| 12px body text | Too small for someone walking in daylight |
| Unsplash stock photos, emoji icons | Contradicts PRODUCT.md's first principle: realness over polish |

Two earlier proposals were rejected. **Mile Zero** (road-sign typography, harbour red and green)
read as too modern and industrial. **Float Homes** (painted-house brights, tilted stickers)
was bolder but not what the founder pictured. Cutouts follows a reference the founder chose:
big friendly type, flat saturated colour shapes, and real objects cut out and layered on top.

---

## 2. The idea

**Do the thing, where it is, and keep a piece of it.**

Every quest has one object: the thing you hold, eat or ride when you do it. A flat white from
Moss Street Market, soft-serve from Beacon Drive-In, a harbour ferry, your runners on Dallas
Road. Each object is photographed for real, cut out, and placed in the interface with a soft
shadow, so screens feel like a collage of things you could go and touch this week.

Quest! is a weekly game whose rule is "earned there": the geofence is the proof, and the
reward lands seconds after the real-world act (PRODUCT.md, principle 3). Cutouts make that
rule visible. You only collect the object by being verified at the place, so your
collection is a record of where you've actually been this season.

The design follows one quest from start to finish, and every screen answers one of the
game's questions: what should I do this week, where do I stand, am I in the zone, did it
count, who else is out there.

The screens are built like a Pinterest collage: real things cut out of photos, a few drawn
characters, and scraps of paper and pen holding it together (§6b).

The ideas that carry the system:

1. **Cutouts are the content.** Objects sit inside sentences, peek out of folders, and break
   out over the edges of shapes. They are always real photographs, never clip art or emoji.
2. **Colour means a kind of quest.** Each category owns one bright colour and keeps it
   everywhere: its folder, its map pin, its feed bubble, its place in your collection.
3. **Ink means act, and ink means status.** Buttons, the active tab, ticks and zone status
   are warm black. Colour is never the signal for "press me" or "it worked", which frees
   the brights to mean only one thing: a kind of quest.
4. **The proof photo leads.** In the feed, the player's own photo comes first. The cutout
   says which quest; the photo says they were there.
5. **Every quest is a real place with real people.** Its page opens on a photo of the
   actual location, with the latest players' proof photos stacked in the corner, the way
   BeReal tucks the front camera into the back-camera shot.

**Anti-references (from PRODUCT.md, still binding):** no AR neon (Pokémon GO), no mascots
or confetti (Duolingo), no data density (Strava), no coupon visuals (loyalty apps).

---

## 3. Colour

### Strategy

Restrained by default, with colour as information. Paper and ink run the interface. The six
brights are categorical data (like series in a chart): they only ever mean a quest type.
Exactly one screen is drenched in colour, **Verified**, in the colour of the quest you just
did, because it's the moment the game is about.

### Category colours

| Category | Token | Hex | Folder back (`*Deep`) | Text on it | Contrast |
|---|---|---|---|---|---|
| Fitness | `sun` | `#FFCE1F` | `#C7A118` | ink | 11.8:1 |
| Food | `tomato` | `#F2584A` | `#BD453A` | ink | 5.2:1 |
| Social | `lilac` | `#C6B2F0` | `#9A8BBB` | ink | 9.2:1 |
| Community | `cobalt` | `#2F6BF0` | `#2553BB` | **white** | 4.6:1 |
| Nature | `grass` | `#34B864` | `#298F4E` | ink | 6.8:1 |
| Sponsored | `tangerine` | `#FF9A1F` | `#C77818` | ink | 8.3:1 |

The `*Deep` shade is the folder's back panel and the bubble tail's shadow side (78% of the
colour mixed with black). React Native has no `color-mix()`, so these are stored as tokens.

### Base colours

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `ink` | `#1C1915` (oklch 0.21 0.008 70) | All text, primary buttons, active tab, ticks and status, the dark This week screen | 15.7:1 on paper |
| `inkSoft` | `#6B665E` | Secondary text on paper and white | 5.1:1 on paper |
| `inkFaint` | `#8E8A84` | Secondary text on ink | 5.1:1 on ink |
| `paper` | `#F6F2EC` | Screen canvas, bottom sheets | |
| `white` | `#FFFDFA` | Floating tab bar, avatar rings, chips, inputs. Never pure `#fff` | |
| `desk` | `#EDE6DC` | Marketing and store backgrounds only (with the faint grid) | |

### Rules

- **One colour per category, everywhere.** If a quest is Food, every surface that represents
  it is tomato. Never use a category colour for anything that isn't that category.
- **Ink is the only action and status colour.** Primary buttons are ink pills with warm-white
  text. Secondary buttons are `rgba(28,25,21,.07)` pills with ink text. Verified, in the
  zone, and done are an ink tick plus words, never green: green means Nature.
- **Neutrals are tinted.** No `#000` or `#fff` anywhere; every neutral leans warm.
- **Text on brights is ink**, except on cobalt, where it's white. No other combinations.
- **Never rely on colour alone.** Every category colour appears with the category name or its
  icon, and every state change has words ("Verified", "Locked").
- **No decorative gradients.** The only gradients live inside photographs.
- **Use bold phrases sparingly.** In sentences, only the actions you can take are bold
  (§9). Elsewhere, plain text.

### Dark mode

The This week screen is dark by design. A full dark mode is out of scope for the pilot; if
added, `ink` becomes the canvas, `#1F1F1F` the sheets, and the category colours stay as they
are (all of them pass with ink text on top, cobalt with warm white).

---

## 4. Typography

### Faces

| Role | Face | Use |
|---|---|---|
| Interface | **Figtree** (400, 500, 600, 700, 800) | Everything: titles, sentences, body, labels, numbers |
| Wordmark | **Pilowlava** | The `Quest!` logo, app icon and splash only. Never headings |

One family does all the work, the way the reference uses one big friendly grotesk. Figtree is
on Google Fonts (`@expo-google-fonts/figtree`, OFL). Space Grotesk, BispoNova and Skyscapers
are retired from the app.

### Scale

| Token | Size / line | Weight, tracking | Use |
|---|---|---|---|
| `title` | 40 / 40 | 800, −4% | One per screen: "This week", "Quests", "City" |
| `sentence` | 24 / 31 | 700, −2% | The This week sentence and the celebration |
| `heading` | 20 / 26 | 800, −2% | Sheet and section headings ("From the city:") |
| `body` | 16 / 24 | 400 | Descriptions, posts, comments |
| `name` | 16 / 22 | 800 | Usernames, quest names in lists |
| `small` | 13 / 18 | 600 | Counts beside titles ("29 quests"), timestamps, folder counts |
| `micro` | 11 / 14 | 700 | XP pills and badges only |

Rules:

- **Running text is never below 16.** Phone mockups shrink everything; the real app doesn't.
- **Sentence case everywhere**, including buttons and tabs. The only exception is the
  wordmark.
- **Counts sit beside titles** in `small` regular weight, right-aligned: `Quests` …
  `29 quests`. No eyebrows or labels above titles.
- **Numbers that change** (XP, counts, ranks) use tabular figures.
- Layouts must survive 130% system text size.

---

## 5. Shape, space and elevation

### Radius by role

| Token | Value | Use |
|---|---|---|
| `folder` | 10 | Category folders (front and back panels) |
| `control` | 14 | Inputs, small thumbnails, the zone map |
| `card` | 22 | Content cards, swatches, photo tiles |
| `bubble` | 30 | Feed speech bubbles |
| `sheet` | 28 | Bottom sheets (top corners only) |
| `pill` | 999 | Buttons, the tab bar, XP pills, chips |
| round | 50% | Avatars, icon buttons |

### Spacing

4pt grid: 4, 8, 12, 16, 20, 24, 32, 48. Screen gutter 16–18. Title block has 20 above and
10 below. Overlapping elements (bubbles, folder papers) overlap by 12.

### Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow | Paper canvas, swatches, list rows |
| Lift | `0 10px 24px -14px rgba(60,40,20,.3)` | Cards on paper |
| Float | `0 8px 20px rgba(0,0,0,.14)` | Floating tab bar, avatar button |
| Stack | `0 8px 16px rgba(0,0,0,.10)` | Each speech bubble over the next |
| Cutout | Baked into the PNG (§6) | Every object |

No blur effects anywhere. They caused the Android haze and cost performance.

---

## 6a. Three kinds of picture

Each kind of image has one shape and one job, so a glance says what you're looking at.

| Picture | Shape | Job | Source |
|---|---|---|---|
| **The place** | Full-bleed rectangle, no radius at screen edges | Shows where the quest happens | Shot on location for Quest! (`quests.cover_image_url`), credited `Photo: Quest!` |
| **The cutout** | No frame, the object and its baked shadow | The thing you collect | §6 |
| **The pillow** | Bulged squircle (Instants-style) with a 2px ink edge, or warm-white edge on dark | A person's proof photo, and their selfie in its corner | `completions.photo_url`, `completions.selfie_url` |

Rules:

- **If it's a pillow, a real person took it.** Never use the pillow shape for place photos,
  ads, sponsor art or placeholders.
- **Place photos follow the same shooting rules as cutouts**: on location, natural light,
  no filters, no people's faces. One landscape photo per quest, 16:10, at least 2000px wide.
- **Pillow sizes:** 62 × 70 in rows and corner stacks, 66 × 74 in feed bubbles, 236 × 268 in
  the full-screen viewer. Always about 8:9, never square, never circular.
- The pillow outline is one shared clip path (`clipPathUnits="objectBoundingBox"`):
  `M.5 0C.83 0 .96.03 .985.18 1 .3 1 .7.985.82.96.97.83 1 .5 1 .17 1 .04.97.015.82 0 .7 0 .3.015.18.04.03.17 0 .5 0Z`.
  In React Native, render it with `react-native-svg` `<ClipPath>` over an `<Image>`.

## 6b. The collage kit

Three layers sit on top of the photos. Each has one job.

| Layer | What | Job | Collectible |
|---|---|---|---|
| **Real cutouts** | Photographed objects from the actual place (§6) | The reward | Yes, the only layer that is |
| **Sprites** | Drawn or 3D characters from around Victoria: harbour seals, gulls, crows, a raccoon, rain clouds, the sun | Reaction and feedback | Never |
| **Scraps** | Torn paper labels, washi tape, pen marks (ring, arrow, underline, sparkle) | Pointing at what matters | Never |

### Sprites

- **A cast, not a mascot.** Several local creatures and weather, none with a name, none that
  speaks or cheers you on. They react to what's happening (a seal dozes on an empty feed, a
  gull perches on the Food folder, a cloud drips when it's raining). This keeps PRODUCT.md's
  anti-reference: no Duolingo-style mascot theatre.
- **Where they live:** This week, Verified, empty states, weather notes, streak moments,
  loading, onboarding, share cards. Never in lists, forms, settings or the camera.
- **Style:** soft 3D or thick-outline illustration with real-looking shading, so they sit
  comfortably next to photographed cutouts, as in the reference collages. One consistent
  style for the whole set.
- **Motion:** a gentle idle loop (bob, blink, flap) that plays 3 times and stops. At most one
  animated sprite per screen. Still with reduce motion on. Built as Lottie or Rive files.
- **Made for Quest!.** Commissioned or drawn in-house. Pinterest and the reference shots
  are mood only; never lift images from them.
- Sprites are decorative to screen readers unless they carry meaning (the rain cloud on a
  weather note gets a label: `Rain this afternoon`).

### Scraps

- **Torn paper label:** warm-white paper with a ragged edge and a light shadow, for a
  heading on a collage moment (`Week 45` on a share card). Ink text, 800 weight.
- **Washi tape:** a translucent butter-yellow strip with faint stripes, holding a proof
  pillow or place photo onto a collage surface (Verified, share cards, You).
- **Pen marks:** hand-drawn ring, arrow, underline and sparkle, drawn once as SVG paths.
  Tomato, cobalt or ink. A ring circles your rank on This week; sparkles mark the cutout
  landing on Verified; an arrow can point at the zone on a share card.
- **Use them to point, never to fill.** A screen gets at most two scraps. Never on lists,
  forms or settings.

## 6. Cutouts

The signature element. Every quest gets exactly one.

### Shooting spec

- One real object per quest, photographed **at or from the place**: the actual cup, cone,
  ticket, boat. If the object can't be carried (a ferry, a mural), photograph it whole from a
  distance that fits it in frame.
- Daylight or a bright window, side-lit, no flash. Plain contrasting background.
- Phone camera is fine. At least 1500px on the long edge.
- No people or faces in cutouts. People appear only in proof photos.

### Processing (automated, §Plan Phase 2)

1. Remove the background to a transparent PNG.
2. Trim to the object, pad 8%.
3. Resize to 600px on the long edge.
4. **Bake the shadow into the image**: `0 5px 5px rgba(0,0,0,.22)` plus
   `0 1px 1px rgba(0,0,0,.12)`. Android can't shadow transparent images natively, so the
   shadow has to be part of the file to look the same on both platforms.
5. Store as WebP with alpha in the `quest-cutouts` bucket; `quests.cutout_url` points to it.

Until a quest has its own cutout, it shows its category's default cutout.

### Placement

| Where | Size | Treatment |
|---|---|---|
| Inline in a sentence | 1.5× the line height | Sits on the baseline, slight overlap with neighbouring words is fine |
| Folder | 54 × 64 | Peeks out of the top-right of the folder, rotated up to 8° |
| Feed bubble, list row | 48 × 48 | Right edge, unrotated |
| Breakout | Up to 60% of screen width | One per screen at most, overlapping a shape's edge |
| Collection (You) | Shelf, 3 across | Objects stand on a shelf line, no cards. Earned: full colour. Locked: grey at 28% opacity with the exact spot (`Beacon Hill Park, by the pond`) |
| Celebration | 50% of screen width | Drops in (§8) |

Never rotate more than 10°, never stack more than three, never add stickers, outlines or
glows. The photo and its shadow are enough.

---

## 7. Signature patterns

### The sentence with objects (This week)

The week's suggestions written as one sentence, with each action in bold ink and its cutout
beside it. The rest of the sentence is `inkFaint` on the dark screen.

> Hi, Ella! This week you could ☕ **grab a flat white** at Moss Street, **run Dallas Road** 👟,
> **ride a harbour ferry** ⛴ and get 🍦 **soft-serve** at Beacon Drive-In.

(Emoji above stand in for cutouts; the app never uses emoji.) Each bold phrase is a tap
target opening that quest. Up to four quests: nearest unplayed, newest drop, expiring soon,
and one a friend just did. Below it, one line: `Picked from 4 quests near you`, with friends'
avatars if any of them did these.

### The scoreboard sentence (This week)

Under the plan, one line in the same voice says where you stand, with a tomato pen ring
around your rank and a seal sprite resting on the edge of the sheet below: `You're 7th with 640 XP.
Two quests gets you past Sam. Your streak is 6 weeks.` The week's clock (`3 days left`,
`Week 45`) sits beside the title. No big-number stat tiles; the game is told, not charted.

### Category folders (Quests)

A two-column grid of folders, one per category. Back panel in `*Deep` with a tab; up to two
quest cover photos and one cutout peek out of the top; front panel in the category colour with
the name (`name` style) and count (`small`). An unplayed-new count badge sits on the front
panel. Tapping a folder opens that category's quest list.

### The quest page

```
┌──────────────────────────────┐
│ (<)                 Fitness  │  place photo, full-bleed, top 46%
│ ▢▢ ← corner stack            │  latest 3 pillows, fanned
│ 23 this week                 │
│ Mile Zero. Photo: Quest!  👟 │  cutout overlaps the bottom edge
├──────────────────────────────┤
│ Run Dallas Road              │
│ 4 km, about 40 min, 150 XP   │
│ ✓ You're in the zone         │
│ Photos from here   See all 23│
│ ▢ ▢ ▢ [+]                    │  pillows with ♥ counts, your empty slot
│ (     Start quest  📷      ) │
└──────────────────────────────┘
```

- **Corner stack:** the three latest proof photos for this quest, fanned (−9°, +6°, 0°),
  top-left of the place photo with an ink `23 this week` tag. Tapping opens the viewer.
  Hidden when nobody has done the quest yet.
- **Photos from here:** a row of up to three pillows with name, time and heart count,
  then a dashed slot with a camera: `You next`. After you complete it, your pillow takes
  the first spot.
- Only photos visible on the public feed appear here: the `feed_public` opt-out, blocks,
  hidden and removed completions all apply (migrations 018, 027, 028).

### Photos from here (viewer)

A dark full-screen viewer, the convention for looking at photos. A fanned stack of
pillows for one quest; swipe to flip. Under the front photo: avatar, username,
`2 h ago, verified`, caption, and round reaction buttons (heart with count, comments,
cheer). One warm-white pill at the bottom: `Start this quest`. The player's selfie, if
they took one, sits in the corner of their place shot as a small pillow.

### Dual-camera proof

Approved Nov 7, 2026. Proof is two shots, BeReal-style: **the place, then you.**

- **Step 1, the place:** the back camera, with the zone chip on screen the whole time and
  an empty pillow slot in the corner labelled `You, next`. Hint copy names what to get in
  frame (`Get the path and the water in.`). This photo is the proof: GPS and the geofence
  check attach to it.
- **Step 2, you:** the app flips to the front camera with a 3-second countdown and takes
  the selfie. A `Skip selfie` button is always visible. Skipping costs nothing: no XP
  penalty, no nagging.
- **Display:** wherever a proof photo appears, the selfie rides in its top-left corner as a
  pillow at about 40% of the photo's width, with a warm-white edge (ink edge on light
  backgrounds). In feed bubbles it's 26 × 30, opposite the avatar. In the viewer it's 62 × 70.
- **Privacy:** the selfie follows every rule the place photo does: the `feed_public`
  opt-out, blocks, reports, moderation removal and account deletion. A report on a post
  covers both photos. Selfies never appear without their place photo, and the place photo
  is never cropped to show the player's exact position.
- **Copy:** the Verified screen says `Your photos are on the City feed. Only you can see
  exactly where you were standing.`

### The zone

On the camera screen, every quest's geofence is drawn as its real shape on a small map,
outlined dashed in the
quest's category colour (`*Deep` stroke, colour at 35% fill), with the player's dot. On the
quest page the same status shows as one line. Under
it, a status line with an ink tick: `You're in the zone`. Only Quest! has this, so it gets
care: it's the rule of the game made visible.

### Verified (the celebration)

The one drenched screen: the full background in the quest's category colour. Top line:
`Verified on Dallas Road, 8:12 am`. The cutout lands large in the middle (§8). One sentence:
`You ran Dallas Road. Runners are in your collection.` Then pills for XP, streak and new rank,
the proof photo with a privacy line (`Only you can see where you were standing.`), and two
buttons: Share (ink) and Done.

### Speech-bubble feed (City)

Each post is a bubble in its quest's category colour. It leads with the proof photo as a
pillow (66 × 74) with the player's avatar on its corner, then name and time, the post text
and an XP pill (`+150 XP`, ink pill, warm white on cobalt bubbles), with the quest's cutout
(40) at the right edge. The XP pill doubles as the verification mark: posts only exist once
verified. Bubbles overlap by 12 with a tail pointing to the next; earlier
posts sit on top. Tapping a bubble opens the photo full screen with likes and comments.

### Floating tab bar

A white pill floating 18 above the bottom safe area, holding four icon buttons; the active
one is an ink pill with a white icon. Your avatar sits in its own white-ringed circle beside
it and opens You.

---

## 8. Motion

One orchestrated moment: **the cutout lands.** When a completion is verified, the quest's
cutout drops from 130% scale and -12° rotation to rest in 420ms on an ease-out-quint curve
(`cubic-bezier(0.22, 1, 0.36, 1)`, no bounce or overshoot), the XP pill counts up, and a
single haptic fires on landing. Then the
cutout flies into the You avatar in the tab bar (300ms) so you see where it went.

Sprites idle gently (§6b): 3 loops of about 2.4s, then still; one per screen. The three pen
sparkles on Verified twinkle 3 times, staggered by 300ms.

Everything else responds to the user only, in 150 to 250ms on ease-out curves: sheets slide
from their edge, buttons, bubbles and folders press to 97% scale while held, tab changes are
instant. No entrance animations on lists, no
looping motion besides skeleton loaders, no confetti.

With reduce motion on, the cutout and XP appear with a 150ms crossfade and nothing flies.

---

## 8b. States

Every interactive element has default, pressed, disabled, loading and error states, with the
same pill and the same ink. The ones that carry the game:

| Zone check | Chip | Copy |
|---|---|---|
| Checking | Grey tick slot, spinner | `Finding you…` |
| Inside | Ink tick | `You're in the zone` |
| Outside | Ink arrow | `140 m to go, toward Clover Point` |
| No permission | Outlined, `!` | `Turn on location to check in` |

| Primary button | Treatment |
|---|---|
| Default | Ink pill, warm-white text, icon after the label |
| Pressed | 97% scale, ink lightened to `#34302A` |
| Outside zone | Disabled: `rgba(28,25,21,.12)` fill, text at 45%. The zone chip above says why |
| Uploading | Ink with a small spinner: `Uploading photo…` |

Empty states show greyed cutouts and one action: `Nobody's posted today. The first proof
photo of the day sits at the top of City until tomorrow.` + `Find a quest`. Upload errors
reassure first: `That photo didn't upload. You're still verified; we'll retry when you have
signal.` Loading uses skeletons in the shape of folders and bubbles, never centred spinners.

## 9. Voice and copy

Like a friend texting you plans: specific places, plain verbs, a little dry humour.

- **Sentence case, plain verbs.** `Start quest`, `Save for later`, `See the map`.
- **Name real places.** "Moss Street Market", not "a local market". Quest descriptions say
  where, what, and why it's worth it, in under 40 words.
- **Numbers are specific.** `4 km, about 40 minutes`, not `Medium`.
- **No `·` meta strings.** Write the sentence, or use separate elements.
- **Bold only what you can do.** In the This week sentence and sheet rows, bold marks the
  action or the place you'd go. Nowhere else.
- **Errors say what happened and what to do.** `You're 140 m outside the zone. Walk toward
  Clover Point and try again.` Never `Oops!`.
- **Empty states give one action.** `Nobody's posted today. Go be first.` with `Find a quest`.
- **Level titles** in sentence case: Rookie, Nomad, Seeker, Explorer, Legend.
- **Pluralise properly.** `1 day left`.
- Use `…` (one character), curly quotes and apostrophes, and a non-breaking space between a
  number and its unit (`4 km`, `150 XP`).

---

## 10. Navigation

| Tab | Was | Job |
|---|---|---|
| **This week** | Explore | What to do now, as a sentence, plus what the city just did |
| **Quests** | (new) | Every quest, in category folders |
| **City** | Quests (feed) | The speech-bubble feed and the map |
| **Rankings** | Rankings | This week's leaderboard |
| **You** (avatar) | Profile + Badges | Stats, your cutout collection, badges, settings |

Badges stay as a system (migrations 019–021); they move from their own tab into You, shown
beside the cutout collection.

---

## 11. Accessibility

PRODUCT.md's bar (WCAG AA, 44pt targets, no colour-only meaning, text scaling, reduced
motion) plus:

- Every cutout has a text alternative naming the object and quest ("Soft-serve cone,
  Beacon Drive-In quest").
- Bold phrases in the This week sentence are separate accessible buttons, read in order.
- Folders and bubbles are single tap targets with a full label ("Food, 6 quests, 2 new").
- Tap targets are at least 48 × 48 (people use this while walking).
- Overlapping layouts keep the reading order top to bottom.

---

## 12. Tokens

Implemented in `apps/mobile/lib/theme.ts` (Phase 1, Nov 7, 2026), with copy helpers in
`apps/mobile/lib/copy.js` and text primitives in `apps/mobile/components/ui/Text.tsx`.
Category icons are Ionicons outline glyphs, already bundled with `@expo/vector-icons`.

Replaces `COLORS`, `RADIUS`, `SPACING`, `TAB_THEMES` and the category maps in
`apps/mobile/lib/constants.ts`, and `tokens/*.css` for admin.

```ts
export const COLOR = {
  ink: '#1C1915', inkSoft: '#6B665E', inkFaint: '#8E8A84', inkPressed: '#34302A',
  paper: '#F6F2EC', white: '#FFFDFA', desk: '#EDE6DC',
  secondaryFill: 'rgba(28,25,21,0.07)', disabledFill: 'rgba(28,25,21,0.12)',
} as const

export const CATEGORY = {
  fitness:   { label: 'Fitness',   color: '#FFCE1F', deep: '#C7A118', onColor: '#141414', icon: 'walk-outline' },
  food:      { label: 'Food',      color: '#F2584A', deep: '#BD453A', onColor: '#141414', icon: 'restaurant-outline' },
  social:    { label: 'Social',    color: '#C6B2F0', deep: '#9A8BBB', onColor: '#141414', icon: 'people-outline' },
  community: { label: 'Community', color: '#2F6BF0', deep: '#2553BB', onColor: '#FFFDFA', icon: 'storefront-outline' },
  nature:    { label: 'Nature',    color: '#34B864', deep: '#298F4E', onColor: '#141414', icon: 'leaf-outline' },
} as const
export const SPONSORED = { color: '#FF9A1F', deep: '#C77818', onColor: '#141414' } as const

export const MOTION = {
  press: { duration: 120, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  sheet: { duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  land:  { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
} as const

export const RADIUS = { folder: 10, control: 14, card: 22, sheet: 28, bubble: 30, pill: 999 } as const
export const SPACE = [0, 4, 8, 12, 16, 20, 24, 32, 48] as const

export const FONT = {
  regular: 'Figtree_400Regular', medium: 'Figtree_500Medium', semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold', black: 'Figtree_800ExtraBold', brand: 'Pilowlava',
} as const

export const TYPE = {
  title:    { fontFamily: FONT.black,    fontSize: 40, lineHeight: 40, letterSpacing: -1.6 },
  sentence: { fontFamily: FONT.bold,     fontSize: 24, lineHeight: 31, letterSpacing: -0.5 },
  heading:  { fontFamily: FONT.black,    fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  body:     { fontFamily: FONT.regular,  fontSize: 16, lineHeight: 24 },
  name:     { fontFamily: FONT.black,    fontSize: 16, lineHeight: 22 },
  small:    { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 18 },
  micro:    { fontFamily: FONT.bold,     fontSize: 11, lineHeight: 14 },
} as const

export const SHADOW = {
  lift:  { shadowColor: '#3C2814', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  float: { shadowColor: '#000',    shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 8 },  elevation: 8 },
  stack: { shadowColor: '#000',    shadowOpacity: 0.10, shadowRadius: 8,  shadowOffset: { width: 0, height: 8 },  elevation: 6 },
} as const
```

A lint rule bans hex literals and raw `fontSize` outside `lib/theme.ts` and the text
primitives (there are 60+ hardcoded hex values in components today).

---

## 13. Keeping it ours

This look is popular on Dribbble, so it can read as borrowed. Three things make it Quest!'s:

1. **The objects are real Victoria things**, photographed by people who live here. Generic
   stock cutouts (a random coffee cup, a clip-art scooter) are not allowed.
2. **Colour has a job.** Brights mean quest types; ink means act. Nothing is coloured for
   decoration.
3. **A cutout is earned there.** You collect it only by being verified at the place, so your
   collection is a record of where you've actually been.
4. **The zone is drawn as its real shape**, and **the proof photo leads every post**. Both are
   things only Quest! has.
5. **The sprites are Victoria's own cast**: harbour seals, gulls, crows, rain. Original art,
   never pulled from Pinterest or stock.

Two habits from the reference to watch: the cream canvas and bolded key words. The canvas is
fine as the reference intends; bold is limited to actions (§9).
