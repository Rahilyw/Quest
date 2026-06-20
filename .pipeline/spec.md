# Spec: Wire Redemption Code Flow

## Open Questions
None.

## Files

Most files in the original task are already in their target state on disk. Only the consumer changes in `QuestHistoryItem.tsx` are still needed. The full picture is documented below for the Coder's verification; if a file is already in the target state, leave it alone.

1. `C:\Users\rahil\Documents\Projects\Kuest\apps\mobile\components\QuestHistoryItem.tsx` — Destructure new optional props (`redemption_code`, `is_sponsored`) and render a sponsor pill or "Reward pending" hint under the date line. This is the only file that still needs editing.

2. `C:\Users\rahil\Documents\Projects\Kuest\apps\admin\app\completions\actions.ts` — VERIFY ONLY. Already contains: `Completion.redemption_code: string | null`, `quests: { title; xp_reward; is_sponsored } | null`, the extended select string, `updateCompletionStatus(id, status, isSponsored)`, and the post-approval `generate-redemption-code` invocation gated by `isSponsored`. No changes needed.

3. `C:\Users\rahil\Documents\Projects\Kuest\apps\admin\app\completions\page.tsx` — VERIFY ONLY. Already passes `c.quests?.is_sponsored ?? false` to `handleUpdateStatus` on Approve and renders the amber sponsor hint at lines 50-54. No changes needed.

4. `C:\Users\rahil\Documents\Projects\Kuest\apps\mobile\app\(tabs)\profile.tsx` — VERIFY ONLY. Already selects `redemption_code` and `quest:quests(title, category, xp_reward, is_sponsored)`, maps them into `CompletedQuest`, and forwards both to `QuestHistoryItem`. No changes needed.

5. `C:\Users\rahil\Documents\Projects\Kuest\apps\admin\lib\invoke-edge-function.ts` — VERIFY ONLY. Already exports `invokeEdgeFunction(name, body)` using `SUPABASE_URL` + `SUPABASE_SECRET_KEY`. No changes needed.

## Interfaces

`QuestHistoryItem.tsx` props (already declared at lines 13-20, do not redeclare):

```ts
interface Props {
  title: string
  category: string
  xp_reward: number
  completed_at: string
  redemption_code?: string | null
  is_sponsored?: boolean
}

export function QuestHistoryItem({
  title,
  category,
  xp_reward,
  completed_at,
  redemption_code,
  is_sponsored,
}: Props): JSX.Element
```

Render structure for the existing `<View style={styles.info}>` block (replaces the current contents of that View, lines 35-38):

```tsx
<View style={styles.info}>
  <Text style={styles.title} numberOfLines={1}>{title}</Text>
  <Text style={styles.date}>{formatCompletedDate(completed_at)}</Text>
  {is_sponsored && redemption_code ? (
    <Text style={styles.codePill}>🎁 Code: {redemption_code}</Text>
  ) : is_sponsored ? (
    <Text style={styles.codePending}>🎁 Reward pending</Text>
  ) : null}
</View>
```

New `StyleSheet.create` entries to add to the existing `styles` object (append after `xp` entry, line 62):

```ts
codePill: {
  alignSelf: 'flex-start',
  marginTop: 4,
  backgroundColor: '#FFF7ED',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 3,
  color: COLORS.sponsor,
  fontWeight: '700',
  fontSize: 11,
},
codePending: {
  marginTop: 4,
  color: COLORS.textMuted,
  fontSize: 11,
},
```

Use `COLORS.sponsor` from `@/lib/constants` (value `'#EA580C'`, already exported on line 28 of constants). `'#FFF7ED'` is the literal background color called for by the task; `COLORS.bgWarm` happens to be the same value, but the spec requires the literal — use the literal `'#FFF7ED'` to match the requested spec exactly.

## Edge Cases

- `is_sponsored` is `undefined` (legacy callers without the prop): render nothing extra — keep the row visually identical to the pre-change layout.
- `is_sponsored === true` and `redemption_code` is `null`: show "🎁 Reward pending" in muted text.
- `is_sponsored === true` and `redemption_code` is a non-empty string: show the orange pill with the code.
- `is_sponsored === false` and `redemption_code` is somehow non-null: do NOT render the pill — gating is on `is_sponsored`, not on presence of the code.
- The pill must not stretch to row-width — use `alignSelf: 'flex-start'` so it hugs its content.
- Do not break the existing `numberOfLines={1}` truncation on `title`; the new node is a sibling under `styles.info`, not a wrapper.
- No new imports are required beyond what `QuestHistoryItem.tsx` already imports (`COLORS` is already imported on line 3).

## Patterns to Follow

- `C:\Users\rahil\Documents\Projects\Kuest\apps\mobile\components\QuestHistoryItem.tsx` (the file being edited) — Preserve its style: functional component, `StyleSheet.create` block at the bottom, all colors/spacing from `@/lib/constants` (`COLORS.sponsor`, `COLORS.textMuted`), no inline style objects in JSX, no comments. Add the new style keys inside the existing `StyleSheet.create({...})` call rather than creating a second one.
- `C:\Users\rahil\Documents\Projects\Kuest\apps\mobile\lib\constants.ts` — Source of `COLORS.sponsor` (`'#EA580C'`) and `COLORS.textMuted`. Do not introduce any color literals beyond the `'#FFF7ED'` background explicitly required by the spec.
- `C:\Users\rahil\Documents\Projects\Kuest\apps\mobile\app\(tabs)\profile.tsx` lines 300-309 — Reference call site that already passes `redemption_code` and `is_sponsored` to `QuestHistoryItem`. The component must accept the new optional props without breaking any other (currently nonexistent) call sites, hence the props remain optional.
