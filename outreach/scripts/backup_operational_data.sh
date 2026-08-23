#!/usr/bin/env bash
# Backs up outreach files that carry real contact PII and are deliberately
# excluded from git (outreach-log.csv, prospect-states.json) to a private
# location outside the repo. Neither file has any other durability net --
# outreach-log.csv is .gitignore'd on purpose (PII shouldn't live in git
# history forever), and prospect-states.json was just never added.
#
# Keeps 30 days of daily snapshots, prunes anything older.
set -euo pipefail

SRC_DIR="/home/user/.openclaw/workspace/collectly"
BACKUP_DIR="/home/user/.openclaw/backups/collectly"
DATE="$(date +%Y-%m-%d)"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

for rel in outreach/data/outreach-log.csv outreach/prospect-states.json; do
  src="$SRC_DIR/$rel"
  if [[ -f "$src" ]]; then
    name="$(basename "$rel")"
    dest="$BACKUP_DIR/${name%.*}-${DATE}.${name##*.}"
    cp "$src" "$dest"
    echo "backed up: $rel -> $dest"
  else
    echo "skip (not found): $rel"
  fi
done

# Prune snapshots older than RETENTION_DAYS
find "$BACKUP_DIR" -type f -mtime "+${RETENTION_DAYS}" -print -delete
