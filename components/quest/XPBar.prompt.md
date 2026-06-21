Signature XP progress bar. Glass White card, Local Signal indigo fill with violet right-blend and glass sheen.

```jsx
<XPBar totalXp={750} />   // Level 3, 50% toward Lv 4
<XPBar totalXp={1450} />  // Level 4, 45% toward Lv 5
<XPBar totalXp={15000} /> // Max level
```

**Visual anatomy:**
1. White card (Card Glass shadow, xl radius)
2. Header: "Level N" left (ink/800) + XP fraction right (mist)
3. Track: Glass Lifted bg, 12px tall, pill radius, 1px border
4. Fill: Local Signal base; right 35% blends to `#8B5CF6` at 55% opacity (fakes gradient)
5. Sheen: 50%-height white strip at 28% opacity (glass highlight)
6. Markers: "Lv N" and "Lv N+1" in Mist/600 at 11px

**Rules:**
- Only show on Profile (full) and Feed header (mini version)
- Never show "Pending XP" — XP only appears after approval
- XP fill transition: 600ms ease-out on mount
