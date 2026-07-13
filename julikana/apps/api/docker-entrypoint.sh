#!/bin/sh
set -e

# Apply any pending Prisma migrations before the app starts. Safe to run on
# every boot — already-applied migrations are skipped. On the very first
# deploy this creates the entire schema from prisma/migrations/0_init.
echo "▶ Running database migrations…"
node node_modules/prisma/build/index.js migrate deploy

echo "▶ Starting Julikana API…"
exec node dist/main.js
