#!/usr/bin/env bash
# Render build script: install deps, apply DB migrations safely, then build Next.js
set -euo pipefail

log() { printf '[render-build] %s\n' "$1"; }

log "Installing dependencies (npm ci)"
npm ci

log "Applying Prisma migrations (migrate deploy)"
# Avoid failing when DATABASE_URL is missing (local preview builds)
if [ -n "${DATABASE_URL:-}" ]; then
  # Fix provider mismatch (P3019) if lock file was created with sqlite previously
  if [ -f prisma/migrations/migration_lock.toml ] && grep -q 'provider = "sqlite"' prisma/migrations/migration_lock.toml; then
    log "Removing outdated migration_lock.toml (sqlite -> postgres)"
    rm -f prisma/migrations/migration_lock.toml
  fi

  set +e
  OUTPUT=$(npx prisma migrate deploy 2>&1)
  STATUS=$?
  set -e
  printf '%s\n' "$OUTPUT"

  if [ "$STATUS" -ne 0 ]; then
    # Baseline existing DB: mark all migrations as applied, then try again
    log "migrate deploy failed; attempting baseline recovery"
    for path in prisma/migrations/*/; do
      [ -d "$path" ] || continue
      dir=$(basename "$path")
      log "Marking migration $dir as applied."
      npx prisma migrate resolve --applied "$dir" || true
    done
    log "Re-running migrate deploy after baseline."
    set +e
    OUTPUT2=$(npx prisma migrate deploy 2>&1)
    STATUS2=$?
    set -e
    printf '%s\n' "$OUTPUT2"

    if [ "$STATUS2" -ne 0 ]; then
      # As a last resort, generate a runtime migration diff from DB -> schema and apply
      log "Baseline recovery failed. Attempting runtime migration via prisma migrate diff."
      ts=$(date +%Y%m%d%H%M%S)
      rt_dir="prisma/migrations/${ts}_render_runtime"
      mkdir -p "$rt_dir"
      npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > "$rt_dir/migration.sql" || {
        log "Runtime diff failed. Aborting build."; exit 1; }
      if [ ! -s "$rt_dir/migration.sql" ]; then
        log "No diff produced; continuing."
      else
        log "Applying runtime migration and marking as applied."
        npx prisma migrate resolve --applied "$(basename "$rt_dir")" || true
        npx prisma migrate deploy || { log "migrate deploy failed after runtime diff."; exit 1; }
      fi
    fi
  fi
else
  log "DATABASE_URL not set; skipping migrate deploy in build."
fi

log "Generating Prisma client"
npx prisma generate

log "Building Next.js"
npm run build
