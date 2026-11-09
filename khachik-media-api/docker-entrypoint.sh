#!/bin/sh
set -eu
npx prisma migrate deploy
if [ "${RUN_SEED:-true}" = "true" ]; then
  node dist/seed.js || true
fi
exec node dist/index.js
