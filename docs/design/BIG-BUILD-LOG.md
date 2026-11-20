# Big build log

Base: `cursor/cutouts-this-week-quests` @ `7b587ae`. Started 2026-11-20.

| # | Card | Branch | Merge commit | Mobile tests | Geofence tests | tsc mobile | tsc admin | next build | Tokens | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | R | `cursor/r-release` | `f9501d9` | 256 passed | 50 + redemption | ok | ok | ok | 126 | `eas.json` already had `autoIncrement` + channels. `expo config` still lists RECORD_AUDIO from a plugin; `blockedPermissions` strips it at build. |
| 2 | Q | `cursor/q-ci` | `689f440` | 256 passed | 50 + redemption | ok | ok | n/a | 126 | Deno not installed locally; CI runs `deno check`. YAML valid. Expo config step runs locally. |
| 3 | S | `cursor/s-stickers` | `9ce395e` | 270 passed (+14 sticker) | 50 + redemption | ok | ok | ok (/stickers) | 126 | Migration **044** (not applied). Grant/revoke via AFTER triggers on verified status + 043 path. Sprite/Cutout deleted. SQL not executed. |
| 4 | V | `cursor/v-verify` | `4c7d6c2` | 270 passed | 50 + redemption | ok | ok | n/a | 126 | `supabase/verify/{039,041-044}.sql` + OWNER-RUNSHEET. 042 derived (no README block). SQL not executed. |
| 5 | C | `cursor/c-xp-mobile` | `c63bad1` | 278 passed | 50 + redemption | ok | ok | n/a | 126 | Also touched submit screen + queue banner/hook for xp_awarded flush (needed for #6). SQL not executed. |
| 6 | E4 | `cursor/e4-selfie` | `2c2d473` | 282 (+4 ownSelfie) | 50 + redemption | ok | n/a | n/a | 126 | Own selfie via ownSelfiePath guard. |
| 7 | P | `cursor/p-pilot-admin` | `18556b4` | 282 | 50 + redemption | ok | ok | ok (/pilot) | 126 | Soft-fallback for missing 043/044. SQL not executed. |
| 8 | F | `cursor/f-feedback` | `82b4c28` | 290 (+8 feedback) | 50 + redemption | ok | ok | n/a | 126 | package.json conflict with E4 test script resolved by combining both entries. |
| 9 | E1 | `cursor/e1-tokens` | `8b62447` | 290 passed | 50 + redemption | ok | n/a | n/a | **0** | CI token job strict, no continue-on-error. MEDAL tokens from BRAND §6c. |
