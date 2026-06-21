Filter pill for quest categories. Inactive = frosted glass. Active = Local Signal indigo with glow.

```jsx
<CategoryChip label="All" active />
<CategoryChip label="🏃 Fitness" />
<CategoryChip label="🍽️ Food" active />
<CategoryChip label="🌿 Nature" count={3} />
```

**States:**
- **Inactive:** Glass White bg, 1.5px near-invisible border, Slate text, subtle shadow
- **Active:** Local Signal (`#6366F1`) fill, white text, Action Glow shadow

**Category labels (canonical):**
```
All | 🏃 Fitness | 🤝 Social | 🍽️ Food | 🏘️ Community | 🌿 Nature
```

**Rule — The Category Independence Rule:** Category colors (green, purple, orange, blue, teal) are for identification on quest cards and map pins. The chip active state uses Local Signal indigo, not the category color. Mixing them confuses the signal.
