The image-led quest card for the Explore tab. Full-width photo, gradient overlay, difficulty pill, START QUEST CTA.

```jsx
<QuestHeroCard
  title="Run the Galloping Goose Trail"
  description="Complete a 5km segment of Victoria's most iconic multi-use trail."
  category="fitness"
  xpReward={350}
  difficulty="MEDIUM"
  tag="TRAIL"
  imageUrl="…"
/>
```

**Visual anatomy:**
1. Hero image (176px) with navy gradient overlay
2. Tag pill top-left (category label, e.g. TRAIL)
3. XP badge top-right (Quest Blue `#4364F7`)
4. Title on image — white, 900 weight
5. Body: description, difficulty pill (green/amber/red), START QUEST button

**Legacy compact card:** `QuestCard.tsx` remains for list-row contexts. Explore uses `QuestHeroCard.tsx`.

**Images:** Category placeholders from `CATEGORY_IMAGES` in `constants.ts` until per-quest cover art exists in DB.

**Design spec:** `DESIGN.md` § Quest hero card (Harbour Electric, June 2026)
