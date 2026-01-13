#!/usr/bin/env bash
# Render build script: install deps, sync DB schema, then build Next.js
set -euo pipefail

log() { printf '[render-build] %s\n' "$1"; }

log "Installing dependencies (npm ci)"
npm ci

log "Applying Prisma schema to database"
if [ -n "${DATABASE_URL:-}" ]; then
  # Use db push to sync schema directly - simpler than migrations for new DBs
  log "Running prisma db push --accept-data-loss"
  npx prisma db push --accept-data-loss || {
    log "db push failed, trying with --force-reset for completely fresh DB"
    npx prisma db push --force-reset --accept-data-loss || {
      log "db push --force-reset also failed. Aborting."
      exit 1
    }
  }
else
  log "DATABASE_URL not set; skipping schema sync."
fi

log "Generating Prisma client"
npx prisma generate

log "Building Next.js"
npm run build
