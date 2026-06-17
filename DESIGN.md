---
name: Kuest
description: Real life, gamified. A weekly city challenge app.
colors:
  after-hours-asphalt: "#0B1120"
  wet-concrete: "#1E293B"
  elevated-pavement: "#273449"
  fog-white: "#F1F5F9"
  street-haze: "#94A3B8"
  city-dust: "#64748B"
  local-signal: "#6366F1"
  signal-bloom: "#312E81"
  signal-glow: "#A5B4FC"
  market-amber: "#F59E0B"
  trail-green: "#22C55E"
  social-purple: "#A855F7"
  vendor-orange: "#F97316"
  community-blue: "#3B82F6"
  harbour-teal: "#06B6D4"
typography:
  display:
    fontFamily: "System (SF Pro Display / Roboto)"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1.0
  title:
    fontFamily: "System (SF Pro Display / Roboto)"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.1
  headline:
    fontFamily: "System (SF Pro Display / Roboto)"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "System (SF Pro Text / Roboto)"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "System (SF Pro Text / Roboto)"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.03em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
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
    backgroundColor: "{colors.local-signal}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.md}"
    padding: "16px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.city-dust}"
    rounded: "{rounded.md}"
    padding: "16px 16px"
  category-chip-active:
    backgroundColor: "{colors.local-signal}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  category-chip-inactive:
    backgroundColor: "{colors.wet-concrete}"
    textColor: "{colors.city-dust}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  quest-card:
    backgroundColor: "{colors.wet-concrete}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.wet-concrete}"
    textColor: "{colors.fog-white}"
    rounded: "{rounded.md}"
    padding: "16px"
  xp-bar-fill:
    backgroundColor: "{colors.local-signal}"
    rounded: "{rounded.pill}"
    height: "10px"
---

# Design System: Kuest

## 1. Overview

**Creative North Star: "The Night Market"**

Kuest runs at the hour when the city stops pretending and starts being itself. The visual system lives after dark: deep asphalt backgrounds, surfaces that read like wet concrete under sodium light, and a single indigo signal that only lights up when something has been genuinely earned. The Night Market does not glow for its own sake. Colour comes from the stalls, from the categories, from the proof photos players submit, not from the chrome of the interface.

The system is built around one rule nobody ever says out loud: the interface should make you feel like you are standing on a real street, not looking at a points app. That means restraint in decoration, weight in typography, and colour used the way a city uses neon: rarely, purposefully, and only on things that actually matter. There is no confetti. There is no mascot. A badge unlocked at Level 5 should feel like something you earned, not something the app handed you to keep you engaged.

Anti-references are load-bearing here. The Night Market explicitly rejects the luminous creature-catching palette of Pokémon GO, the cartoon reward theater of Duolingo, the data-dense athlete dashboard of Strava, and the punch-card transactional warmth of loyalty apps. If a screen could belong to any of those products, it belongs to none of them.

**Key Characteristics:**
- Deep near-black background; surfaces step up by 4-6% lightness, never by hue shift
- One accent colour (Local Signal indigo) held in reserve for earned, interactive, and ranked moments only
- Category identity carried by five distinct semantic colours, never by indigo
- Typography-heavy hierarchy; weight contrast does more work than size contrast
- Flat at rest, faint ambient glow on interactive elements under press/focus
- Imperfection is permitted; roughness where it serves realness

## 2. Colors: The Night Market Palette

Dark neutrals from the street, five category signals from the stalls, one earned indigo held back until it matters.

### Primary
- **Local Signal** (`#6366F1`): The earned accent. Used on XP values, active leaderboard rank, the XP bar fill, active tab indicators, and primary CTA buttons only. Its rarity is the point. Nothing in the interface should use this colour casually.
- **Signal Bloom** (`#312E81`): The soft backing of earned surfaces: the "your rank" strip on the leaderboard, selected state backgrounds. Never used as a standalone colour; always paired with Local Signal text.
- **Signal Glow** (`#A5B4FC`): Text on Signal Bloom backgrounds. Lighter than Local Signal; used for username display in earned-state rows.

### Neutral
- **After-Hours Asphalt** (`#0B1120`): The base layer. Every screen starts here. Not black; tinted slightly toward indigo so it reads as a night sky, not a void.
- **Wet Concrete** (`#1E293B`): Cards, inputs, tab bars, and all primary interactive surfaces. The floor of the market.
- **Elevated Pavement** (`#273449`): Surfaces that sit above the base: distance pills, secondary badges, the faint surface behind the XP bar track. Reserved for the third layer only; never used as a card background.
- **Fog White** (`#F1F5F9`): Primary text. Off-white with a trace of blue; reads cleanly against After-Hours Asphalt without the clinical harshness of pure white.
- **Street Haze** (`#94A3B8`): Secondary text: subtitles, supporting labels, usernames in non-earned contexts.
- **City Dust** (`#64748B`): Muted text: placeholder copy, disabled labels, metadata. Anything the eye should skip over.

### Secondary (Category Signals)
Five colours, one per quest category. They appear on category chips, map pins, icon box tints, and the subtle card edge treatment. None of them are accent colours; they are identification signals, not emphasis signals.

- **Trail Green** (`#22C55E`): Fitness quests, success states, approval confirmed.
- **Social Purple** (`#A855F7`): Social quests.
- **Vendor Orange** (`#F97316`): Food quests.
- **Community Blue** (`#3B82F6`): Community quests.
- **Harbour Teal** (`#06B6D4`): Nature quests.

### Tertiary
- **Market Amber** (`#F59E0B`): Sponsored quests and warning states. Used on the sponsor pill and sponsor badge only. Warm, commercial; distinct from the cooler category signals.

### Named Rules
**The Local Signal Rule.** Local Signal indigo (`#6366F1`) appears on at most 8% of any screen's visible area. It is reserved for: XP values, active leaderboard position, the XP bar fill, active/selected interactive states, and primary CTA buttons. If you reach for it to add interest to a screen that feels flat, you are using it wrong. Make the screen less flat a different way.

**The Category Independence Rule.** Category colours carry identity, not status. They are never used as accent colours, never mixed with Local Signal, and never applied to text that isn't a category label. A fitness quest is green because it is a fitness quest, not because the interface is trying to be visually interesting.

## 3. Typography

**Display / Title Font:** System default (SF Pro Display on iOS, Roboto on Android)
**Body Font:** System default (SF Pro Text on iOS, Roboto on Android)

Kuest ships with system fonts at launch. This is a deliberate choice, not a deferred one: system fonts render at full quality instantly, respect user accessibility settings (Dynamic Type on iOS), and signal confidence rather than decoration. The personality comes from weight and scale contrast, not from font selection. Revisit at Season 2 if brand identity needs a stronger typographic signature.

**Character:** Weight-driven hierarchy with a steep jump between body and display. The logo feels enormous because it is enormous; the metadata feels small because it should disappear. No gradient between levels; each step is a decision.

### Hierarchy
- **Display** (800, 48px, line-height 1.0): The Kuest wordmark on auth screens only. Never reused inside the app.
- **Title** (800, 28-32px, line-height 1.1): Screen headers (Leaderboard, Profile). One per screen. Fog White.
- **Headline** (700-800, 18-22px, line-height 1.3): Quest card titles, section headings, quest detail titles.
- **Body** (400-600, 14-16px, line-height 1.5): Quest descriptions, meta text, tab labels. Maximum 60ch wide; descriptions truncate at 2 lines in card context.
- **Label** (700, 11-13px, line-height 1.2, letter-spacing 0.03em): Category chips, XP values, badge names, distance pills. Uppercase tracking optional for chips; avoid for names.

### Named Rules
**The Weight-Over-Size Rule.** Increase hierarchy by jumping weight before jumping size. A label at 13px/700 reads as more important than body text at 15px/400. Use this before reaching for a larger size step.

## 4. Elevation

Kuest is flat at rest. Surfaces are differentiated by background colour stepping (Asphalt → Wet Concrete → Elevated Pavement), not by shadows. A card on the quest feed is `#1E293B` on `#0B1120`; no shadow needed because the colour contrast already reads as lift.

Interactive elements receive a faint ambient indigo glow on press and focus. This signals "this responds" without decorating the resting state. The glow is always Local Signal at low opacity, never coloured by the category.

### Shadow Vocabulary
- **Earned Glow** (`shadowColor: #6366F1, shadowOpacity: 0.4, shadowRadius: 4, elevation: 2`): XP bar fill only. A soft indigo bloom under the progress track. Signals that progress is meaningful, not mechanical.
- **Interactive Press** (future): Subtle inward shadow on button/card press to signal physical response. Not yet implemented; target `shadowOpacity: 0.15, shadowRadius: 2` in After-Hours Asphalt.

### Named Rules
**The Flat-By-Default Rule.** No card, row, or container receives a shadow unless it is either interactive (and the shadow is a state, not decoration) or an earned-moment element (XP bar, rank strip). If a surface needs a shadow to read as a surface, fix the background colour step instead.

## 5. Components

### Buttons
Blunt and confident. No gradient, no icon by default, no loading spinner beyond text swap.

- **Shape:** Gently curved (12px radius)
- **Primary:** Local Signal background (`#6366F1`), Fog White text, full-width in auth and quest detail contexts. Padding 16px vertical. Text at 16px/700.
- **Disabled:** 40% opacity. No colour change; same shape, same text.
- **Ghost / Sign-out:** Transparent background, 1px border in City Dust, City Dust text. Used only for destructive or secondary actions.

### Category Chips (Filter Row)
- **Inactive:** Wet Concrete background, City Dust text, pill radius. Compact horizontal list.
- **Active:** Local Signal background, Fog White text. State is clear; no border, no icon needed.
- **Rule:** Category chips never show category colour. They show identity (the category label) not allegiance. Colour is on the card, not the filter.

### Quest Cards
The central repeating element. Each card identifies its category through a narrow colour stripe on the left edge (4px, absolute-positioned) and a tinted icon box (category colour at 13% opacity). The stripe is an existing implementation choice; future iterations should consider replacing it with the icon box alone, as the stripe risks reading as a decorative accent rather than a functional identifier.

- **Background:** Wet Concrete (`#1E293B`)
- **Border:** 1px, same as surface (effectively invisible; present for accessibility contrast on OLED)
- **Radius:** Large (16px)
- **Padding:** 16px
- **Category signal:** Left-edge 4px stripe in category colour + tinted icon box
- **Sponsor pill:** Market Amber tint, amber text, pill radius. Appears above the title when `is_sponsored` is true.
- **XP value:** Local Signal, 800 weight, 13px. Bottom-right. The only use of Local Signal on a resting card.

### XP Bar
The signature component. A horizontal progress track from current-level XP to next-level XP.

- **Track:** Elevated Pavement (`#273449`), 10px tall, pill radius
- **Fill:** Local Signal (`#6366F1`), same height and radius, with Earned Glow shadow beneath
- **Fill highlight:** A 50%-height white strip at 30% opacity across the top of the fill, simulating a light source
- **Label row:** "Level N" in Fog White/700 left, XP fraction in City Dust/400 right

### Inputs / Text Fields
Undecorated. The field is the focus.

- **Style:** Wet Concrete background, no border at rest. Fog White text, City Dust placeholder.
- **Radius:** Medium (12px). Padding 16px.
- **Focus:** Not yet implemented; target a 1px Local Signal border on focus.
- **Error:** Not yet implemented; target City Dust → red text swap with an inline error message below the field.

### Tab Navigation
- **Background:** After-Hours Asphalt (matches screen background; the bar disappears into it)
- **Active:** Local Signal icon + label, filled Ionicons variant
- **Inactive:** City Dust icon + label, outline Ionicons variant
- **Height:** 64px with 8px bottom padding (safe area aware)
- **Typography:** 600 weight label at system small size

### Leaderboard Row (Signature Component)
Every row is a competition artefact, not a list item. Rank signals are medals (top 3) or City Dust numbers (4+). The viewer's own row is Signal Bloom tinted with Signal Glow text.

- **Default row:** flat, 1px City Dust/20% bottom border
- **Alternating tint:** every second row at Wet Concrete to create rhythm without card overhead
- **Your rank strip:** Signal Bloom (`#312E81`), 1px Local Signal border, Signal Glow username text
- **Medal emojis:** native, 20px, no additional styling

## 6. Do's and Don'ts

### Do:
- **Do** hold Local Signal (`#6366F1`) to under 8% of any screen's visible area. When in doubt, ask whether this moment was earned.
- **Do** use category colours as identification signals: on map pins, icon box tints, and category chips. Never as emphasis or decoration.
- **Do** step surfaces by background colour (Asphalt → Wet Concrete → Elevated Pavement) before reaching for a shadow.
- **Do** write quest copy and empty states as if a person who lives in Victoria wrote them. Generic placeholder language fails the Local Signal Rule.
- **Do** let system typography do its job. 800 weight at 28px reads like a title. Trust it.
- **Do** keep the XP bar the only element on a screen that glows. It earns its glow; nothing else does.

### Don't:
- **Don't** use gradient text or background-clip text tricks. Local Signal is already bold; making it a gradient cheapens what it signals.
- **Don't** use border-left or border-right greater than 1px as a coloured card accent. The quest card's 4px left stripe is an existing pattern; avoid introducing it to new components. Prefer icon-box tints or background tints as the category identifier going forward.
- **Don't** show confetti, completion animations, or XP counters before a submission is approved. Earned means approved. Pre-approval celebration is the Duolingo pattern and it is explicitly rejected.
- **Don't** use the AR neon palette of Pokémon GO (cyan-on-black, floating orbs, creature silhouettes). Kuest rewards are real; the visual language must be too.
- **Don't** use cartoon mascots, achievement sticker aesthetics, or Duolingo-style "you did it" full-screen moments.
- **Don't** replicate fitness-tracker data density from Strava: segment breakdowns, pace charts, heart-rate graphs. Kuest tracks quests, not performance metrics.
- **Don't** use punch-card or loyalty-points visual language. A sponsored quest is a real quest that carries a reward. Design it like a quest, not a coupon.
- **Don't** add shadows to resting cards, list rows, or non-interactive containers. The Flat-By-Default Rule is not a suggestion.
- **Don't** introduce a second accent colour for variety. If a screen feels flat, the problem is hierarchy or spacing, not colour count.
