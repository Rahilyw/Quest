#!/usr/bin/env bash
# Run supabase/tests/*.test.sql against the M1 throwaway stack (.stack).
# Prerequisites: apply.sh left the stack running; DB_URL in env or .db-url.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$ROOT/scripts/db-local/.stack"
TESTS_SRC="$ROOT/supabase/tests"
TESTS_DST="$WORK/supabase/tests"

if [[ ! -d "$WORK/supabase" ]]; then
  echo "pgtap: missing $WORK — run scripts/db-local/apply.sh first" >&2
  exit 1
fi

if [[ -z "${DB_URL:-}" ]]; then
  if [[ -f "$ROOT/scripts/db-local/.db-url" ]]; then
    DB_URL="$(tr -d '[:space:]' < "$ROOT/scripts/db-local/.db-url")"
  fi
fi
if [[ -z "${DB_URL:-}" ]]; then
  echo "pgtap: DB_URL not set and .db-url missing" >&2
  exit 1
fi

echo "pgtap: enabling extension + loading helpers…"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS pgtap;'
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$TESTS_SRC/00_helpers.sql"
# Diagnose definers missing search_path (printed into CI logs before suites).
psql "$DB_URL" -c "
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prosecdef
   AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
          WHERE cfg LIKE 'search_path=%'
       )
 ORDER BY 1;
"

rm -rf "$TESTS_DST"
mkdir -p "$TESTS_DST"
# Copy only *.test.sql — helpers already applied via psql.
cp "$TESTS_SRC"/*.test.sql "$TESTS_DST/"

echo "pgtap: supabase test db (workdir $WORK)…"
cd "$WORK"
# CLI discovers supabase/tests/*.sql relative to the project workdir.
supabase test db

echo "pgtap: all suites passed"
