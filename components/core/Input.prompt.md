Text input with Glass White surface. Matches auth form inputs in the mobile app.

```jsx
<Input placeholder="Email" type="email" />
<Input placeholder="Password" type="password" label="Password" />
<Input placeholder="Username" label="Username" error="Username is already taken" />
<Input placeholder="Search quests…" type="search" disabled />
```

**States:**
- **Rest:** `1.5px solid rgba(15,23,42,0.06)` border (nearly invisible)
- **Focus:** `1.5px solid #6366F1` (Local Signal) — the only visible focus indicator
- **Error:** border stays accent; error message in orange-600 below the field
- **Disabled:** 50% opacity, not-allowed cursor

**Notes:**
- No background tint on focus — white stays white
- Label uses Label font style (13px/700)
- Error uses Label SM (11px), orange-600 — never red
