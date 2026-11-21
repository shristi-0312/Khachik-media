#!/usr/bin/env bash
# Run on the EC2 host (called by GitHub Actions or manually).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> Pull already done by CI; deploying from $ROOT"

# --- API ---
cd "$ROOT/khachik-media-api"
if [ ! -f .env ]; then
  echo "Missing khachik-media-api/.env — create it on the server first."
  exit 1
fi

npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run db:seed || true

pm2 startOrReload "$ROOT/infra/ecosystem.config.cjs" --only khachik-api --update-env
pm2 save

# --- Admin SPA ---
cd "$ROOT/khachik-media-admin"
# Keep existing .env; only create a default if missing
if [ ! -f .env ]; then
  echo 'VITE_API_URL=https://3-108-244-235.sslip.io/api' > .env
fi

npm ci
npm run build
sudo mkdir -p /var/www/html/admin
sudo rsync -a --delete dist/ /var/www/html/admin/
sudo nginx -t && sudo systemctl reload nginx

curl -fsS http://127.0.0.1:4000/health
echo ""
echo "Deploy complete"
