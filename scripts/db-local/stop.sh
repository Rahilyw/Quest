#!/usr/bin/env bash
# Stop the throwaway stack started by apply.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$ROOT/scripts/db-local/.stack"

if [[ -d "$WORK/supabase" ]]; then
  echo "db-local: stopping stack in $WORK"
  (cd "$WORK" && supabase stop --no-backup) || true
fi
rm -rf "$WORK"
rm -f "$ROOT/scripts/db-local/.db-url"
echo "db-local: stopped"
