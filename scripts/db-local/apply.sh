#!/usr/bin/env bash
# Apply every migration in dependency order to a throwaway local Supabase stack.
# Clean install order (DB-01): baseline, then 002..044 ascending, then seed.
# Leaves the stack running for verify.sh; call stop.sh when finished.
# See supabase/migrations/README.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG_DIR="$ROOT/supabase/migrations"
SEED="$ROOT/supabase/seed.sql"
TEMPLATE="$ROOT/scripts/db-local/config.toml.template"
# Stable path so verify.sh / stop.sh can find the same stack across CI steps.
WORK="$ROOT/scripts/db-local/.stack"
export WORK

if [[ -d "$WORK/supabase" ]]; then
  (cd "$WORK" && supabase stop --no-backup >/dev/null 2>&1) || true
fi
rm -rf "$WORK"
mkdir -p "$WORK/supabase"
cp "$TEMPLATE" "$WORK/supabase/config.toml"
# No migrations/ directory and no seed.sql on purpose: supabase start must not
# auto-apply filename-sorted migrations or seed into an empty schema.
# Seed is applied below, after baseline + 002..044.

echo "db-local: workdir $WORK"
cd "$WORK"
echo "db-local: starting local stack (no migrations auto-applied)…"
supabase start -x studio,imgproxy,logflare,vector,supavisor

# DB URL for psql. Prefer status -o env; fall back to parsing status text.
DB_URL="$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL=//p' | tr -d '"' || true)"
if [[ -z "${DB_URL}" ]]; then
  DB_URL="$(supabase status | sed -n 's/^[[:space:]]*DB URL[[:space:]]*|[[:space:]]*//p' | head -1 | tr -d '[:space:]')"
fi
if [[ -z "${DB_URL}" ]]; then
  echo "db-local: could not read DB URL from supabase status" >&2
  supabase status >&2 || true
  exit 1
fi
echo "db-local: DB URL acquired"
echo "$DB_URL" > "$ROOT/scripts/db-local/.db-url"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "DB_URL=$DB_URL" >> "$GITHUB_ENV"
fi

# ---------------------------------------------------------------------------
# Harness shims for extensions / roles hosted Supabase provides by default.
# NEVER edit migrations 002–040 or the baseline; shim here instead.
# ---------------------------------------------------------------------------
psql_shim() {
  local label="$1"
  local sql="$2"
  local start_ms end_ms
  start_ms="$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -c "$sql" >/dev/null
  end_ms="$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')"
  echo "applied shim:${label} in $((end_ms - start_ms))ms"
}

# 013 / 031 / 041 expect postgis, pg_cron, and (when offered) pg_net — hosted has them.
psql_shim "extensions" "
  CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  DO \$\$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
      CREATE EXTENSION IF NOT EXISTS pg_net;
    END IF;
  END \$\$;
"

apply_file() {
  local file="$1"
  local start_ms end_ms
  start_ms="$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file" >/dev/null
  end_ms="$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')"
  echo "applied $(basename "$file") in $((end_ms - start_ms))ms"
}

echo "db-local: applying baseline then 002..044…"
apply_file "$MIG_DIR/20260619010246_initial_schema.sql"

# Numbered follow-ups through 044 (045 is proven on the duo line in card M5).
NUMBERED=()
while IFS= read -r f; do
  NUMBERED+=("$f")
done < <(
  for f in "$MIG_DIR"/[0-9][0-9][0-9]_*.sql; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    num="${base%%_*}"
    num=$((10#$num))
    if (( num >= 2 && num <= 44 )); then
      printf '%03d\t%s\n' "$num" "$f"
    fi
  done | sort -n | cut -f2-
)

for f in "${NUMBERED[@]}"; do
  apply_file "$f"
done

echo "db-local: seeding…"
# seed.sql re-inserts badges that migrations 019/020 already added. Keep the
# repo seed untouched (outside this card's file list); apply a CI-safe copy
# that skips badge names that already exist.
SEED_CI="$WORK/seed.ci.sql"
python3 - "$SEED" "$SEED_CI" <<'PY'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()
# Convert `insert into badges (...) values (...);` into a WHERE NOT EXISTS form.
pat = re.compile(
    r"insert\s+into\s+badges\s*\(([^)]+)\)\s*values\s*(.*?);",
    re.IGNORECASE | re.DOTALL,
)
def repl(m):
    cols = m.group(1).strip()
    values = m.group(2).strip()
    col_list = [c.strip() for c in cols.split(",")]
    name_idx = next(i for i, c in enumerate(col_list) if c.lower() == "name")
    aliases = ", ".join(f"c{i}" for i in range(len(col_list)))
    select_cols = ", ".join(f"v.c{i}" for i in range(len(col_list)))
    return (
        f"insert into badges ({cols})\n"
        f"select {select_cols} from (values {values}) as v({aliases})\n"
        f"where not exists (select 1 from badges b where b.name = v.c{name_idx});"
    )
open(dst, "w", encoding="utf-8").write(pat.sub(repl, text))
PY
apply_file "$SEED_CI"

echo "db-local: apply complete (stack still running; run verify.sh then stop.sh)"
