#!/usr/bin/env bash
# Append a single prospect to data/prospects.csv.
# Usage: add-prospect.sh <id> <first> <last> <company> <role> <country> <team_size> <industry> <linkedin_url> <email> <source> [notes]
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ $# -lt 11 ]]; then
  echo "Usage: $0 <id> <first> <last> <company> <role> <country> <team_size> <industry> <linkedin_url> <email> <source> [notes]" >&2
  exit 1
fi

id="$1"; first="$2"; last="$3"; company="$4"; role="$5"; country="$6"
team="$7"; industry="$8"; linkedin="$9"; email="${10}"; source="${11}"; notes="${12:-}"

# basic dedup by id
if grep -q "^${id}," data/prospects.csv; then
  echo "ID ${id} already exists. Aborting." >&2
  exit 1
fi

# escape any double quotes in fields
csv_escape() { printf '"%s"' "${1//\"/\"\"}"; }

notes_field="$(csv_escape "$notes")"
linkedin_field="$(csv_escape "$linkedin")"
email_field="$(csv_escape "$email")"
source_field="$(csv_escape "$source")"

printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
  "$id" "$first" "$last" "$(csv_escape "$company")" "$(csv_escape "$role")" "$country" "$team" "$industry" \
  "$linkedin_field" "$email_field" "$source_field" "$notes_field" \
  >> data/prospects.csv

echo "Added $id: $first $last @ $company"
wc -l data/prospects.csv
