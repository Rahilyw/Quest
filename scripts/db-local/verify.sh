#!/usr/bin/env bash
# Run supabase/verify/*.sql against the local stack left by apply.sh.
# Fails on any real SQL error. Human paste-and-edit placeholders (<test-player-1>,
# <old-quest-id>, …) are stripped so the structural checks still run in CI;
# behaviour with real IDs is covered by pgTAP in card M2.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VERIFY_DIR="$ROOT/supabase/verify"

if [[ -n "${DB_URL:-}" ]]; then
  :
elif [[ -f "$ROOT/scripts/db-local/.db-url" ]]; then
  DB_URL="$(cat "$ROOT/scripts/db-local/.db-url")"
else
  DB_URL="$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL=//p' | tr -d '"' || true)"
fi
if [[ -z "${DB_URL:-}" ]]; then
  echo "db-local verify: DB_URL not set; run apply.sh first" >&2
  exit 1
fi

mkdir -p "$ROOT/scripts/db-local/.verify-out"

sanitize() {
  local src="$1" dst="$2"
  python3 - "$src" "$dst" <<'PY'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()
# Drop any line whose SQL string literal is a human placeholder like '<test-player-1>'.
placeholder = re.compile(r"'<[^']+>'")
out = []
skipping_txn = False
for line in text.splitlines(True):
    if placeholder.search(line):
        # Drop placeholder-bearing lines; keep BEGIN/ROLLBACK balance by
        # skipping until ROLLBACK if we are inside a tainted block.
        skipping_txn = True
        continue
    if skipping_txn:
        if re.match(r"(?i)^\s*rollback\s*;", line):
            out.append(line)
            skipping_txn = False
        continue
    out.append(line)
open(dst, "w", encoding="utf-8").write("".join(out))
PY
}

shopt -s nullglob
files=("$VERIFY_DIR"/*.sql)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "db-local verify: no files in $VERIFY_DIR" >&2
  exit 1
fi

# Lexicographic order matches 039, 041, 042, 043, 044.
IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

for f in "${files[@]}"; do
  base="$(basename "$f")"
  sanitized="$ROOT/scripts/db-local/.verify-out/$base"
  sanitize "$f" "$sanitized"
  echo "db-local verify: $base"
  start_ms="$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')"
  if ! psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$sanitized" >"$ROOT/scripts/db-local/.verify-out/$base.out" 2>"$ROOT/scripts/db-local/.verify-out/$base.err"; then
    echo "db-local verify FAILED: $base" >&2
    cat "$ROOT/scripts/db-local/.verify-out/$base.err" >&2 || true
    cat "$ROOT/scripts/db-local/.verify-out/$base.out" >&2 || true
    exit 1
  fi
  end_ms="$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')"
  echo "verified $base in $((end_ms - start_ms))ms"
done

echo "db-local verify: all green"
