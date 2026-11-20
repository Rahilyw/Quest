# Design System: Quest!

The current design direction is **Cutouts** (approved Nov 7, 2026).

- **Spec (source of truth):** [docs/design/BRAND.md](docs/design/BRAND.md): colour, type, shape,
  the three kinds of picture (place photos, cutouts, pillow proof photos), the collage kit,
  motion, states, voice, navigation, accessibility and tokens.
- **Build plan:** [docs/design/UI-OVERHAUL-PLAN.md](docs/design/UI-OVERHAUL-PLAN.md): seven
  phases and decisions D1 to D8.
- **Implementation handoff:** [docs/design/CLAUDE-NEXT-IMPLEMENTATION-PROMPT.md](docs/design/CLAUDE-NEXT-IMPLEMENTATION-PROMPT.md): Claude-ready brief that records Cursor's parallel work and prioritizes the next redesign increment.
- **Mobile tokens in code:** `apps/mobile/lib/theme.ts`, text primitives in
  `apps/mobile/components/ui/Text.tsx`, copy helpers in `apps/mobile/lib/copy.js`.

The earlier Harbour Electric and Summer 2026 systems, and the exported design bundle that
described them (`tokens/`, `guidelines/`, `components/`, `ui_kits/`), were removed on
Nov 7, 2026. They remain in git history.
