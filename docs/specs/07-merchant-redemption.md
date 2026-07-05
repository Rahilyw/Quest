# Spec 07 — Merchant Redemption Validation

**Status:** Draft
**Depends on:** Spec 02 (codes are now assigned at verification time, in-DB)
**Problem:** sponsor renewal rate is the revenue metric, but a redemption code today is just text on a profile screen. Café staff can't verify a code, and there's no redemption count to bring to a renewal conversation. This closes the loop — and is worth more than the CSV export currently on the roadmap.

## 1. What the merchant gets

A dead-simple page, no account, no training: open a link → type the code → **VALID / ALREADY USED / INVALID** in big colour-coded type → one tap to mark redeemed.

## 2. Data (migration)

```sql
ALTER TABLE completions ADD COLUMN redeemed_at TIMESTAMPTZ;

CREATE TABLE sponsors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT UNIQUE NOT NULL,        -- joins on quests.sponsor_name for now
  merchant_key  TEXT UNIQUE NOT NULL,        -- unguessable slug in the merchant URL
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`quests.sponsor_name` stays the join key in v1 (no quest-table migration); the `sponsors` row adds identity + the merchant key. Formalising a `sponsor_id` FK is deliberate scope for the self-serve portal later.

## 3. Merchant page (`apps/admin`, public route)

- **Route:** `/redeem/[merchantKey]` — outside the admin auth middleware; the unguessable key *is* the auth (same trust level as a Stripe payment link). Printed on a card handed to the sponsor at onboarding.
- **Flow:** code input (8-char, auto-uppercase) → server action looks up the completion **scoped to that sponsor's quests only** → renders:
  - ✅ **Valid** — quest title, reward text ("Free double shot upgrade"), player level chip → **[Mark redeemed]** sets `redeemed_at`.
  - 🟡 **Already used** — with redeemed date/time.
  - ❌ **Invalid** — not found or belongs to another sponsor.
- Idempotent server action; rate-limited per key (10 lookups/min) to stop code-guessing; works on a phone behind the counter.

## 4. Sponsor reporting (`/sponsors`, existing page)

Add per-sponsor: **codes issued · codes redeemed · redemption rate · last redemption**. This is the renewal-conversation slide. The existing CSV export gains the redemption columns.

## 5. Player side (small)

- Profile quest history already shows the code; add reward text + *"Show this screen at the counter"* framing, and a "Redeemed ✓" state once `redeemed_at` is set (realtime not required — refetch on focus).
- Redemption code also appears on the Spec 02 celebration for sponsored quests (already specced).

## 6. Measurement

Spec 04 events: `redemption_code_viewed`; the redemption itself is DB truth (no analytics needed). North-star sponsor metric: **redemption rate per sponsored quest** — a sponsor who sees 40 redeemed coffees renews.

## 7. Non-goals (v1)

Merchant accounts/logins, QR scanning (typing 8 chars is fine at a counter), self-serve sponsor portal (Phase 4 as before), payouts/discount math, per-staff attribution.
