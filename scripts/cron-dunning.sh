#!/bin/bash
# Cron entry point for dunning sequence
# Reads CRON_SECRET from a gitignored file to avoid exposing in argv
SECRET_FILE="$(dirname "$0")/../.cron_secret.txt"
if [ ! -f "$SECRET_FILE" ]; then
  echo "ERROR: $SECRET_FILE not found" >&2
  exit 1
fi
SECRET=$(cat "$SECRET_FILE")
BASE_URL="${COLLECTLY_BASE_URL:-http://localhost:3030}"
curl -fsS -m 30 -H "Authorization: Bearer $SECRET" "$BASE_URL/api/cron/dunning" 2>&1
