Primary interactive control for all user-facing actions — CTAs, form submissions, navigation triggers.

```jsx
<Button label="Get Started" variant="primary" fullWidth />
<Button label="Cancel" variant="ghost" />
<Button label="Forgot password?" variant="link" size="sm" />
<Button label="Disabled" variant="primary" disabled />
```

**Variants:**
- `primary` — Local Signal bg (#6366F1), white text, Action Glow shadow. Use for the one clear action per screen.
- `ghost` — transparent bg, subtle border, Slate text. Destructive actions, secondary options.
- `link` — no bg, no border, accent color text. Inline navigation, "already have an account?" links.

**Sizes:** `md` (default, 14px vertical pad) / `sm` (8px vertical pad)

**Rules:**
- Disabled = 40% opacity only, never hide or remove
- fullWidth on auth screens and modal footers
- Primary button gets Action Glow in all states — the shadow is structural, not a hover effect
- Never stack two primary buttons; use primary + ghost or primary + link
