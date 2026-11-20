# Big build log

Base: `cursor/cutouts-this-week-quests` @ `7b587ae`. Started 2026-11-20.

| # | Card | Branch | Merge commit | Mobile tests | Geofence tests | tsc mobile | tsc admin | next build | Tokens | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | R | `cursor/r-release` | `f9501d9` | 256 passed | 50 + redemption | ok | ok | ok | 126 | `eas.json` already had `autoIncrement` + channels. `expo config` still lists RECORD_AUDIO from a plugin; `blockedPermissions` strips it at build. |
| 2 | Q | `cursor/q-ci` | `689f440` | 256 passed | 50 + redemption | ok | ok | n/a | 126 | Deno not installed locally; CI runs `deno check`. YAML valid. Expo config step runs locally. |
| 3 | S | `cursor/s-stickers` | `9ce395e` | 270 passed (+14 sticker) | 50 + redemption | ok | ok | ok (/stickers) | 126 | Migration **044** (not applied). Grant/revoke via AFTER triggers on verified status + 043 path. Sprite/Cutout deleted. SQL not executed. |
| 4 | V | `cursor/v-verify` | `4c7d6c2` | 270 passed | 50 + redemption | ok | ok | n/a | 126 | `supabase/verify/{039,041-044}.sql` + OWNER-RUNSHEET. 042 derived (no README block). SQL not executed. |
| 5 | C | `cursor/c-xp-mobile` | `c63bad1` | 278 passed | 50 + redemption | ok | ok | n/a | 126 | Also touched submit screen + queue banner/hook for xp_awarded flush (needed for #6). SQL not executed. |
