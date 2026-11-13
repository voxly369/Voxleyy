#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DOCKER="${DOCKER:-sudo docker}"
CONTAINER_NAME="${VOXLY_PG_CONTAINER:-voxly-pg15-rls}"
PG_PORT="${VOXLY_PG_PORT:-55432}"
PG_USER="${VOXLY_PG_USER:-postgres}"
PG_PASSWORD="${VOXLY_PG_PASSWORD:-postgres}"
PG_DB="${VOXLY_PG_DB:-postgres}"
SMOKE_USER="${VOXLY_SMOKE_USER:-voxly_rls_runner}"
SMOKE_PASSWORD="${VOXLY_SMOKE_PASSWORD:-runner}"
export PGPASSWORD="$PG_PASSWORD"

WORKSPACE="/workspace"

psql_run() {
  $DOCKER exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" "$@"
}

if [ "${VOXLY_PG_FRESH:-1}" = "1" ]; then
  $DOCKER rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

if ! $DOCKER inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  $DOCKER run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -p "${PG_PORT}:5432" \
    -v "$ROOT:/workspace:ro" \
    postgres:15
  for _ in $(seq 1 60); do
    if $DOCKER exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

echo "==> bootstrap"
$DOCKER exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" \
  -f "$WORKSPACE/supabase/tests/local/00_bootstrap.sql"

echo "==> migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "    $(basename "$f")"
  psql_run -f "$WORKSPACE/supabase/migrations/$(basename "$f")"
done

echo "==> after-migrations (local grants)"
$DOCKER exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" \
  -f "$WORKSPACE/supabase/tests/local/01_after_migrations.sql"

LOG="/tmp/voxly_rls_smoke_$(date +%s).log"
echo "==> rls smoke (log: $LOG)"
set +e
PGPASSWORD="$SMOKE_PASSWORD" $DOCKER exec -i -e PGPASSWORD="$SMOKE_PASSWORD" "$CONTAINER_NAME" \
  psql -v ON_ERROR_STOP=1 -U "$SMOKE_USER" -d "$PG_DB" \
  -f "$WORKSPACE/supabase/tests/rls_smoke_test.sql" 2>&1 | tee "$LOG"
SMOKE_EXIT=${PIPESTATUS[0]}
set -e

echo "==> summary"
grep -E '^\s*(PASS|FAIL)\s*\|' "$LOG" || true
echo "smoke_exit=$SMOKE_EXIT log=$LOG"
exit "$SMOKE_EXIT"
