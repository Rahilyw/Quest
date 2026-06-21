Compact pill label for category tags, sponsor markers, and status chips.

```jsx
<Badge label="fitness" variant="category" category="fitness" />
<Badge label="Habit Coffee" variant="sponsor" icon="⭐" />
<Badge label="+150 XP" variant="accent" />
<Badge label="0.8 km" variant="muted" icon="📍" />
<Badge label="Approved" variant="success" />
```

**Variants:**
- `category` — soft category tint bg + full category color text. Requires `category` prop for color.
- `sponsor` — Warm Sand bg, orange border + text. Use for sponsored quest pills only.
- `accent` — Signal Soft bg + Signal Deep text. For XP amounts in earned/active contexts.
- `muted` — Glass Lifted bg, mist text. Distance, timestamps, metadata.
- `success` — green-50 bg, success green text. Approval confirmed.
- `warning` — amber-50 bg, amber text. Pending review warnings.

**The Category Independence Rule:** category colors are identification only — never mix with indigo.
