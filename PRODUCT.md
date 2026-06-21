# Product

## Register

product

## Users

Urban residents aged 20-35 in mid-size walkable cities (pilot: Victoria, BC). They feel the gap between wanting more real-world connection and not knowing how to start. They already use gamified apps daily (Duolingo, Strava) and are comfortable with social proof, streaks, and leaderboards. They use Quest! on their phone outdoors: walking to a quest, standing at a location, or checking the leaderboard on Sunday night. Ambient light is variable; one-handed use is common; they are in motion or about to be.

Secondary user: the admin operator (solo founder in the pilot). Uses the web dashboard at a desk to approve completions, manage quests, and review sponsor reports.

## Product Purpose

Quest! turns a city into a game board. Players earn XP, badges, and leaderboard rank for doing things they would want to do anyway: running a trail, visiting a local cafe, helping at a community event, meeting a stranger. The product solves the cold-start problem of real-world social connection by giving people a reason to show up, a framework for repeat behavior, and a community to compete within. Success is measured by weekly active users who return after their first quest and local businesses who renew their sponsored quest.

## Brand Personality

Bold · Local · Playful

The voice is confident and slightly irreverent. It does not explain itself. It speaks like a friend who knows the city well and wants you to get off the couch. It avoids corporate warmth, startup cheerfulness, and gamified hype. Every word should feel like it was written by someone who actually lives in the city and means it.

## References

Early BeReal: raw social energy, anti-perfection, grounded in real moments. The product felt like it was made by and for the people using it, not designed by a committee for a target demographic. That texture, that sense that the interface trusts the user to handle something unpolished and real, is the north star.

The June 2026 Figma reimagining adds a **game-show layer**: photo proof in a public feed, a podium rankings screen, and hero quest cards that sell the adventure before you tap in. Social proof is visible, not hidden behind a profile tab.

## Anti-references

- **Pokémon GO**: No AR overlays, neon fictional-world palettes, or creature-collecting aesthetics. Quest! rewards are real; the visual language must be too.
- **Duolingo**: No cartoon mascots, confetti explosions, or gamification theater. Badges and XP should feel earned, not handed out like stickers.
- **Strava**: No fitness-tracker data density, segment-obsessed leaderboards, or athlete-performance aesthetics. Quest! is for everyone going outside, not just people training.
- **Generic loyalty apps**: No punch-card patterns, coupon-clipping UI, or "rewards points" visual language. The sponsored quest must feel like a real quest that happens to have a reward, not a marketing promotion dressed as a game.

## Design Principles

1. **Realness over polish.** The interface should feel like it was made for the city, not for a portfolio. Proof photos in the activity feed are the product — not stock imagery.
2. **Local identity is the product.** Generic is a bug. Every surface should feel like it could only exist in the city it serves. Quest copy, category names, empty states: all of them should feel written by someone standing on that street.
3. **Earned, not given.** XP and badges carry weight because they represent real effort. The UI must respect that: no confetti on a pending submission, no XP counter before approval, no fake progress on incomplete actions.
4. **Bold decisions, not safe ones.** Bold · Local · Playful means committing to choices that surprise. A podium leaderboard and navy hero headers are intentional — not a generic list with medals pasted on.
5. **Design serves getting outside.** Every tap, every screen, every empty state should reduce friction between the user and the real world. If a screen makes someone spend longer in the app, it has failed.

## Mobile information architecture

Five primary tabs (see `DESIGN.md`):

| Tab | Job to be done |
|-----|----------------|
| **Explore** | "What should I do next?" — discover quests with hero imagery |
| **Quests** | "What's happening in the city?" — map + social proof feed |
| **Rankings** | "Where do I stand?" — weekly competition, podium, chasers |
| **Badges** | "What have I earned?" — collection progress and locked goals |
| **Profile** | "What's my story?" — stats, recent activity, account access |

Settings, edit profile, quest detail, and submission remain stack screens outside the tab bar.

## Accessibility & Inclusion

WCAG AA minimum. Touch targets 44x44pt minimum. Color contrast 4.5:1 for body text, 3:1 for large text and UI components. Do not rely on color alone to convey state. Support system font size scaling. Respect `prefers-reduced-motion` for any animation.
