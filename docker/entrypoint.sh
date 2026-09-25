#!/bin/sh
set -e
mkdir -p /data
npx prisma migrate deploy
node scripts/seed-if-empty.mjs
exec npx next start --hostname 0.0.0.0 --port 3000
