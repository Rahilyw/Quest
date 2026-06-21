The central repeating content card. White glass, category icon box, glass specular highlight, XP in category color.

```jsx
<QuestCard
  title="Run the Galloping Goose Trail"
  description="Lace up and hit Victoria's iconic rail trail. Any distance counts."
  category="fitness"
  xpReward={150}
  distance="0.8 km"
/>
<QuestCard
  title="Morning Coffee at Habit"
  description="Order something you've never tried. Bonus: chat with the barista."
  category="food"
  xpReward={75}
  isSponsored
  sponsorName="Habit Coffee"
  distance="0.3 km"
/>
```

**Visual anatomy:**
1. Glass specular: 1px white line at top edge — light on glass
2. Icon box: 52×52, category soft tint bg, large emoji
3. Category pill OR sponsor pill (never both)
4. Title: 15px/800 weight, single line truncated
5. Description: 13px/400, max 2 lines
6. Footer: distance pill (mist) + XP value (category color, 800 weight)

**XP color rule:** XP on a quest card uses category color. XP earned (profile, celebration) uses indigo.
**No side stripe** — removed in the Saltwater Saturday redesign.
