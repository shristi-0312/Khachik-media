#!/usr/bin/env bash
# Fix mistaken Vercel env (value was "VITE_API_URL=https://...") and redeploy Production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SITE="$ROOT/khachik-media-site"
API_URL="${API_URL:-https://3-108-244-235.sslip.io/api}"

cd "$SITE"

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI not found. Install: npm i -g vercel"
  exit 1
fi

echo "==> Linking project (if needed)"
vercel link --yes --project khachik-media 2>/dev/null || vercel link --yes

echo "==> Removing broken Production VITE_API_URL (if any)"
vercel env rm VITE_API_URL production --yes 2>/dev/null || true

echo "==> Setting VITE_API_URL=$API_URL"
printf '%s' "$API_URL" | vercel env add VITE_API_URL production

echo "==> Redeploying Production (no build cache)"
vercel deploy --prod --force --yes

echo
echo "Done. Hard-refresh https://www.khachikmedia.com/stills"
