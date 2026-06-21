Filter chips on the Explore screen. Active state uses Navy fill (not Quest Blue).

```jsx
<CategoryChip label="ALL" active />
<CategoryChip label="FITNESS" active={false} />
<CategoryChip label="🍽️ FOOD" active={false} />
```

- **Inactive:** Glass White bg, subtle border, Slate Muted text
- **Active:** Navy (`#0D1B3E`) fill, white text, subtle shadow
- **Rule:** Chips show category labels; colour identity lives on the quest card, not the filter

**Design spec:** `DESIGN.md` § Category Chips (Harbour Electric)
