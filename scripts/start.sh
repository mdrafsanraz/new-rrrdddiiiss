#!/usr/bin/env sh
set -eu

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

echo "[rdistro] host=${HOSTNAME} port=${PORT}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[rdistro] ERROR: DATABASE_URL is not set on this service."
  echo "[rdistro] Add Variable Reference: DATABASE_URL = Postgres.DATABASE_URL"
  exit 1
fi

if [ -z "${AUTH_SECRET:-}" ]; then
  echo "[rdistro] ERROR: AUTH_SECRET is not set."
  exit 1
fi

echo "[rdistro] syncing database schema (prisma db push)…"
npx prisma db push --skip-generate

if [ -n "${CRON_SECRET:-}" ] && { { [ -n "${ACRCLOUD_HOST:-}" ] && [ -n "${ACRCLOUD_ACCESS_KEY:-}" ] && [ -n "${ACRCLOUD_ACCESS_SECRET:-}" ]; } || [ -n "${AUDD_API_TOKEN:-}" ]; }; then
  echo "[rdistro] starting delayed ACR worker…"
  node scripts/acr-worker.mjs &
else
  echo "[rdistro] audio recognition worker disabled (CRON_SECRET or provider credentials missing)"
fi

echo "[rdistro] starting Next.js…"
exec node .next/standalone/server.js
