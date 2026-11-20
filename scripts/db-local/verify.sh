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
# Human paste-and-edit tokens like '<test-player-1>' / '<old-quest-id>'.
placeholder = re.compile(r"'<[^']+>'")
begin_re = re.compile(r"(?i)^\s*begin\s*;")
end_re = re.compile(r"(?i)^\s*(rollback|commit)\s*;")

lines = text.splitlines(True)
out = []
i = 0
while i < len(lines):
    if begin_re.match(lines[i]):
        # Collect the whole transaction (nested BEGIN counts).
        block = [lines[i]]
        depth = 1
        i += 1
        while i < len(lines) and depth > 0:
            if begin_re.match(lines[i]):
                depth += 1
            elif end_re.match(lines[i]):
                depth -= 1
            block.append(lines[i])
            i += 1
        # Drop the entire block if any statement inside uses a placeholder.
        # Line-based stripping left broken multi-line INSERTs and orphan ROLLBACKs.
        if not placeholder.search("".join(block)):
            out.extend(block)
        continue
    # Outside a transaction: drop any line that still carries a placeholder.
    if placeholder.search(lines[i]):
        i += 1
        continue
    out.append(lines[i])
    i += 1

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
