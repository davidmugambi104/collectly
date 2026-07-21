#!/usr/bin/env bash
# Rewrites collectly.app -> getcollectly.app across src/ and launch/outreach.
# Preserves dev@collectly.app (dev fixtures only) and bare product name "Collectly".

set -e
cd "$(dirname "$0")/.."

# Files to update: everything in src/, launch/, outreach/
FILES=$(grep -rln --include="*.ts" --include="*.tsx" --include="*.md" --include="*.txt" --include="*.js" --include="*.json" "collectly-ochre\.vercel\.app\|collectly\.app" src/ launch/ outreach/ 2>/dev/null | grep -v node_modules | grep -v ".next/")

UPDATED=0
for f in $FILES; do
  # Skip dev fixture file
  if [ "$f" = "src/db/dev-auth.ts" ]; then
    continue
  fi

  before=$(cat "$f")

  # 1. https://collectly-ochre.vercel.app -> https://getcollectly.app
  # 2. https://collectly.app             -> https://getcollectly.app
  # 3. mailto:.*@collectly.app           -> mailto:.*@getcollectly.app
  # 4. (collectly.app) in URL contexts   -> getcollectly.app
  # 5. collectly.app/pay/ etc            -> getcollectly.app/pay/
  # 6. leave dev@collectly.app alone (matches 5 already? no, it's a mailto)
  after=$(echo "$before" | sed -E '
    s|https?://collectly-ochre\.vercel\.app|https://getcollectly.app|g
    s|https?://collectly\.app|https://getcollectly.app|g
    s|([a-zA-Z0-9/_.?=&%#-])collectly\.app|\1getcollectly.app|g
    s|mailto:([a-zA-Z0-9._-]+)@collectly\.app|mailto:\1@getcollectly.app|g
  ')

  if [ "$before" != "$after" ]; then
    echo "$f" > /dev/null
    echo "$after" > "$f"
    UPDATED=$((UPDATED+1))
  fi
done

echo "Updated $UPDATED files"
