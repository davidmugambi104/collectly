#!/bin/bash
SECRET_FILE="$(dirname "$0")/../.cron_secret.txt"
SECRET=$(cat "$SECRET_FILE")
BASE_URL="${COLLECTLY_BASE_URL:-http://localhost:3030}"
curl -fsS -m 10 -H "Authorization: Bearer $SECRET" "$BASE_URL/api/healthcheck" 2>&1 || echo "healthcheck failed (non-fatal)"
