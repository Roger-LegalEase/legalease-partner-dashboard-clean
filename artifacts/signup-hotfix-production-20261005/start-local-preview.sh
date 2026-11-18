#!/usr/bin/env bash
set -eu
cd /tmp/expai-signup-production-20261005
# This worktree has no .env.local or .env files. Refuse any new real env file.
for file in .env .env.local .env.development .env.development.local; do
  if [ -f "$file" ]; then echo 'Refusing env-file configuration; inspect before testing.' >&2; exit 1; fi
done
# Discard inherited service keys/tokens. Only synthetic LOCAL configuration.
exec env -i PATH="$PATH" HOME="$HOME" NODE_ENV=development \
  NEXT_TELEMETRY_DISABLED=1 \
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4599 \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=local-synthetic-public-key \
  node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3199
