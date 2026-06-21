Circular user avatar. Shows photo when available; falls back to a colored initial derived deterministically from the username hash.

```jsx
<Avatar username="hazel_v" size={48} />
<Avatar username="coastrunner" size={32} />
<Avatar username="jada_bc" src="https://example.com/photo.jpg" size={64} />
```

**Behavior:**
- 7-color palette derived from category colors (green, purple, orange, blue, teal, amber, pink)
- Each username always maps to the same color — consistent across sessions and platforms
- Photo takes priority — shown as circular crop with object-fit cover

**Sizes:** 32px (leaderboard rows), 40px (feed header), 48px (default), 64px (profile detail), 88px (profile hero)

**Never:** grey silhouette fallback, square crop, inconsistent color per render
