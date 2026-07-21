#!/usr/bin/env bash
# Pass 2: clean up the rename leftovers.

set -e
cd "$(dirname "$0")/.."

FILES=$(grep -rln --include="*.ts" --include="*.tsx" --include="*.md" --include="*.txt" --include="*.js" --include="*.json" "getgetcollectly\.app\|@collectly\.app\|collectly\.app" src/ launch/ outreach/ 2>/dev/null | grep -v node_modules | grep -v ".next/")

UPDATED=0
for f in $FILES; do
  if [ "$f" = "src/db/dev-auth.ts" ]; then continue; fi

  before=$(cat "$f")

  after=$(echo "$before" | sed -E '
    # 1. getgetcollectly -> getcollectly
    s|getgetcollectly\.app|getcollectly.app|g

    # 2. dynamic mailto: ${...}@collectly.app, {var}@collectly.app
    s|([$}])@collectly\.app|\1@getcollectly.app|g

    # 3. bare "collectly.app" in prose (preceded by start, space, or punctuation, not / or @)
    s|(^|[ "'\'',.:;!?\(])collectly\.app|\1getcollectly.app|g
  ')

  if [ "$before" != "$after" ]; then
    echo "$after" > "$f"
    UPDATED=$((UPDATED+1))
  fi
done

echo "Pass 2 updated $UPDATED files"
