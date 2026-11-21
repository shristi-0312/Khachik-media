#!/usr/bin/env bash
# Force this Mac onto the live Vercel site (bypasses sticky router/Framer DNS).
set -euo pipefail

VERCEL_IP="${VERCEL_IP:-216.198.79.1}"

echo "==> Pinning www.khachikmedia.com + khachikmedia.com -> ${VERCEL_IP} in /etc/hosts"
TMP="$(mktemp)"
# Drop any old khachikmedia lines, then add the Vercel pin.
grep -v -E '[[:space:]](www\.)?khachikmedia\.com([[:space:]]|$)' /etc/hosts > "$TMP" || true
printf '%s www.khachikmedia.com khachikmedia.com\n' "$VERCEL_IP" >> "$TMP"
sudo cp "$TMP" /etc/hosts
rm -f "$TMP"

echo "==> Flushing DNS cache"
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null || true

echo "==> Checking"
dscacheutil -q host -a name www.khachikmedia.com || true
echo
curl -sI --max-time 10 https://www.khachikmedia.com/ | grep -iE 'HTTP/|server:|x-vercel|framer' || true
TITLE=$(curl -sL --max-time 10 https://www.khachikmedia.com/ | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' | head -1)
echo "title: ${TITLE}"

if echo "$TITLE" | grep -qi 'Crafting stories'; then
  echo
  echo "Still seeing Framer. Open an Incognito window, or set Wi‑Fi DNS to 1.1.1.1 and retry."
  exit 1
fi

echo
echo "OK — hard-refresh the browser (Cmd+Shift+R) or open a new Incognito tab:"
echo "  https://www.khachikmedia.com/"
