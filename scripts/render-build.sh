#!/usr/bin/env bash
# Render build script: install deps, sync DB schema, then build Next.js
set -euo pipefail

log() { printf '[render-build] %s\n' "$1"; }

log "Installing dependencies (npm ci)"
npm ci

log "Applying Prisma migrations to database"
if [ -n "${DATABASE_URL:-}" ]; then
  log "Running prisma migrate deploy"
  npx prisma migrate deploy || {
    log "migrate deploy failed, falling back to db push for fresh DB"
    npx prisma db push --accept-data-loss || {
      log "db push also failed. Aborting."
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
