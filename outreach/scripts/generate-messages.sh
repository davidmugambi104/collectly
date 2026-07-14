#!/usr/bin/env bash
# Print the T1/T2/T3 messages customized for a given prospect, ready to paste.
# Usage: generate-messages.sh <prospect_id>
set -euo pipefail
cd "$(dirname "$0")/.."

id="${1:-}"
if [[ -z "$id" ]]; then
  echo "Usage: $0 <prospect_id>" >&2
  exit 1
fi

# CSV with quoted fields — use python for safe parsing.
read_vars="$(python3 - "$id" <<'PY'
import csv, sys
target = sys.argv[1]
with open('data/prospects.csv', newline='') as f:
    r = csv.DictReader(f)
    for row in r:
        if row['id'] == target:
            for k in ('first_name', 'last_name', 'company', 'industry', 'team_size'):
                v = row.get(k, '') or ''
                v = v.replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
                print(f'export {k}="{v}"')
            sys.exit(0)
sys.exit(1)
PY
)" || { echo "No prospect with id '$id' in data/prospects.csv" >&2; exit 1; }

eval "$read_vars"

# Calendar + sender name — set your defaults here
your_name="${YOUR_NAME:-Davie}"
calendar_link="${CALENDAR_LINK:-https://cal.com/collectly/15min}"

render() {
  local template="$1"
  sed -e "s/{{first_name}}/${first_name}/g" \
      -e "s/{{company}}/${company}/g" \
      -e "s/{{industry}}/${industry}/g" \
      -e "s/{{team_size}}/${team_size}/g" \
      -e "s/{{your_name}}/${your_name}/g" \
      -e "s|{{calendar_link}}|${calendar_link}|g" \
      "$template"
}

for step in t1-cold t2-followup t3-final; do
  echo
  echo "============================================================"
  echo "  $step  →  ${first_name} @ ${company}"
  echo "============================================================"
  render "messages/${step}.md"
done
