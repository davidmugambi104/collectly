#!/usr/bin/env bash
# Push .env.local to Vercel production env.
# Uses VERCEL_TOKEN from .creds (no --token flag, Vercel CLI 56+).

set -e

cd "$(dirname "$0")/.."

if [ -z "$VERCEL_TOKEN" ] && [ -f .creds ]; then
  tmpcreds=$(mktemp)
  sed -E 's/^export[[:space:]]+//' .creds > "$tmpcreds"
  set -a; source "$tmpcreds"; set +a
  rm -f "$tmpcreds"
fi

if [ -z "$VERCEL_TOKEN" ]; then
  echo "VERCEL_TOKEN not set"
  exit 1
fi

export VERCEL_TOKEN

# Confirm we can talk to Vercel
echo "=== Vercel auth ==="
npx vercel whoami 2>&1 | tail -1

# Confirm project link
if [ ! -d .vercel ]; then
  echo "=== Linking project ==="
  npx vercel link --yes 2>&1 | tail -3
fi

# Skip dev-only and CI-internal keys
SKIP='^(GITHUB_TOKEN|USE_DEV_AUTH|NEXT_PUBLIC_USE_DEV_AUTH|USE_PGLITE|VERCEL_OIDC_TOKEN)$'

SUCCESS=0
SKIPPED=0
FAILED=0
FAILED_KEYS=()

echo
echo "=== Pushing env vars to production ==="
while IFS='=' read -r key value; do
  case "$key" in
    ''|\#*) continue ;;
  esac
  if [[ "$key" =~ $SKIP ]]; then
    echo "  ⊘ $key (dev/CI-only, skipping)"
    SKIPPED=$((SKIPPED+1))
    continue
  fi
  # strip surrounding quotes
  clean=$(printf '%s' "$value" | sed -E 's/^"(.*)"$/\1/' | sed -E "s/^'(.*)'$/\1/")
  if [ -z "$clean" ]; then
    echo "  ⊘ $key (empty, skipping)"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  if [[ "$key" == NEXT_PUBLIC_* ]]; then
    envs="production,preview,development"
    sensitive_flag="--no-sensitive"
  else
    envs="production"
    sensitive_flag=""
  fi

  # Pipe value via stdin (so . in URLs doesn't trip the CLI)
  out=$(printf '%s' "$clean" | npx vercel env add "$key" "$envs" --yes $sensitive_flag 2>&1)
  if echo "$out" | grep -qiE "Updated Environment Variable|Added Environment Variable"; then
    echo "  ✓ $key"
    SUCCESS=$((SUCCESS+1))
  elif echo "$out" | grep -qiE "already exists"; then
    # Re-add for next env in list (e.g. NEXT_PUBLIC_ on all 3 envs);
    # the first env was added, the 2nd/3rd hit "already exists" — that's fine.
    echo "  ✓ $key (partial: already exists on one or more envs)"
    SUCCESS=$((SUCCESS+1))
  else
    echo "  ✗ $key"
    echo "      $(echo "$out" | tail -3 | tr '\n' ' ' | head -c 250)"
    FAILED=$((FAILED+1))
    FAILED_KEYS+=("$key")
  fi
done < .env.local || true

echo
echo "=== Summary: success=$SUCCESS, skipped=$SKIPPED, failed=$FAILED ==="
if [ $FAILED -gt 0 ]; then
  echo "Failed keys:"
  for k in "${FAILED_KEYS[@]}"; do echo "  - $k"; done
fi
# Don't exit non-zero — caller may want to retry the failed ones.
