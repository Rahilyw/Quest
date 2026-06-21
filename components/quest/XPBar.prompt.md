XP progress display. On Explore, a compact inline bar lives inside `PlayerCard` (Quest Blue gradient card). Full card variant on profile contexts.

```jsx
<PlayerCard profile={profile} weeklyRank={12} />
<XPBar totalXp={3450} />   // Full card on profile-adjacent screens
```

**Player card (Explore):**
1. Quest Blue gradient background
2. Avatar, level title (EXPLORER / LEGEND), white inline XP bar
3. Today XP counter top-right

**Full XP bar card:**
1. Glass White card, soft shadow
2. Header: "Level N" + XP fraction
3. Track: Glass Lifted, Quest Blue fill
4. Markers: Lv N / Lv N+1

**Rules:**
- Never show pending XP — only after admin approval
- Quest Blue (`#4364F7`) for fill, not legacy indigo

**Design spec:** `DESIGN.md` § Player card / XP Bar (Harbour Electric)
