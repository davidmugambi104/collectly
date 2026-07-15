#!/usr/bin/env bash
# Deploy collectly to Vercel and configure env vars.
#
# Requires:
#   1. VERCEL_TOKEN env var (get from https://vercel.com/account/tokens)
#   2. .env.local with all the API keys
#
# Reads .env.local, pushes only the variable NAMES (not values) to Vercel,
# then sets each value via `vercel env add`.

set -e

# Try to source from .creds if it exists (file format: VERCEL_TOKEN=*** or export VERCEL_TOKEN=***)
if [ -z "$VERCEL_TOKEN" ] && [ -f .creds ]; then
  # strip 'export ' prefix from each line so both formats work
  tmpcreds=$(mktemp)
  sed -E 's/^export[[:space:]]+//' .creds > "$tmpcreds"
  set -a; source "$tmpcreds"; set +a
  rm -f "$tmpcreds"
fi

if [ -z "$VERCEL_TOKEN" ]; then
  echo "VERCEL_TOKEN not set. Get one at https://vercel.com/account/tokens"
  echo "Then either:"
  echo "  export VERCEL_TOKEN=*** && ./scripts/deploy-vercel.sh"
  echo "  OR put 'VERCEL_TOKEN=***' (one line, with the VERCEL_TOKEN= prefix) in .creds and re-run"
  exit 1
fi

# Read env vars safely — only output names, never values
KEYS=()
while IFS='=' read -r key value; do
  case "$key" in
    ''|\#*|GITHUB_TOKEN|USE_DEV_AUTH|NEXT_PUBLIC_USE_DEV_AUTH|USE_PGLITE|CRON_SECRET) continue ;;
  esac
  if [ -n "$value" ]; then
    KEYS+=("$key")
  fi
done < .env.local

echo "Keys to upload: ${#KEYS[@]} total"
echo

# Link project if not linked
if [ ! -d ".vercel" ]; then
  echo "=== Linking to Vercel ==="
  npx vercel link --yes --token *** 2>&1 | tail -5
else
  echo "=== Already linked ==="
  cat .vercel/project.json
fi

# Upload each env var
echo
echo "=== Uploading env vars ==="
for key in "${KEYS[@]}"; do
  value=$(grep "^$key=" .env.local | sed "s/^$key=//" | tr -d '"')
  if [ -z "$value" ]; then
    echo "  ✗ $key (empty, skipping)"
    continue
  fi

  if [[ "$key" == NEXT_PUBLIC_* ]]; then
    envs="production preview development"
  else
    envs="production"
  fi

  echo -n "$value" | npx vercel env add "$key" $envs --yes --token *** 2>&1 | grep -v "Vercel CLI" | head -2 | sed "s/^/  /"
  echo "  ✓ $key"
done

echo
echo "=== Deploying ==="
npx vercel deploy --prod --yes --token *** 2>&1 | tail -15
