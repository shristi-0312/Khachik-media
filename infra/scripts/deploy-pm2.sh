#!/usr/bin/env bash
# Run on the EC2 host from /opt/khachik-media (or called by GitHub Actions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# --- API ---
cd "$ROOT/khachik-media-api"
if [ ! -f .env ]; then
  echo "Missing khachik-media-api/.env — copy from .env.example and fill values."
  exit 1
fi
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
# Seed is idempotent (upserts admin + projects)
npm run db:seed || true
pm2 startOrReload "$ROOT/infra/ecosystem.config.cjs" --only khachik-api
pm2 save

# --- Admin SPA ---
cd "$ROOT/khachik-media-admin"
if [ ! -f .env ]; then
  echo "VITE_API_URL=http://$(curl -s ifconfig.me || echo 127.0.0.1)" > .env
fi
npm ci
npm run build
sudo mkdir -p /var/www/html/admin
sudo rsync -a --delete dist/ /var/www/html/admin/
sudo nginx -t && sudo systemctl reload nginx

curl -fsS http://127.0.0.1:4000/health
echo "Deploy complete"
