#!/usr/bin/env bash
# Applies any supabase/migrations/*.sql file that hasn't been run yet.
#
# Tracks applied files in a public._schema_migrations table. On first run
# against an existing database, every migration already known to have been
# run by hand (001..032, per README.md) is recorded without re-executing it
# -- only files newer than that baseline are actually applied. Bump
# BASELINE_UP_TO when new migrations are folded into the assumed-applied set
# (should not normally be needed; new files are picked up automatically).
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set}"

BASELINE_UP_TO="032"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../supabase/migrations" && pwd)"

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
create table if not exists public._schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
SQL

for f in "$MIGRATIONS_DIR"/*.sql; do
  base="$(basename "$f")"
  version="${base%%_*}"

  if [[ "$version" < "$BASELINE_UP_TO" || "$version" == "$BASELINE_UP_TO" ]]; then
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q \
      -v base="$base" \
      -c "insert into public._schema_migrations(version) values (:'base') on conflict do nothing;"
    continue
  fi

  already=$(psql "$SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 \
    -v base="$base" \
    -c "select 1 from public._schema_migrations where version = :'base';")

  if [[ "$already" == "1" ]]; then
    echo "skip (already applied): $base"
    continue
  fi

  echo "applying: $base"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -1 -f "$f"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q \
    -v base="$base" \
    -c "insert into public._schema_migrations(version) values (:'base');"
  echo "applied: $base"
done
