#!/usr/bin/env bash
# Record an outreach action.
# Usage:
#   log-outreach.sh sent      <prospect_id> <step: t1|t2|t3> [channel: linkedin|email]
#   log-outreach.sh noreply   <prospect_id> <step>
#   log-outreach.sh reply     <prospect_id> [notes]
#   log-outreach.sh interview <prospect_id> [YYYY-MM-DD] [notes]
#   log-outreach.sh lost      <prospect_id> [notes]
set -euo pipefail
cd "$(dirname "$0")/.."

action="${1:-}"
id="${2:-}"
shift 2 || true

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

case "$action" in
  sent)
    step="${1:-t1}"; channel="${2:-linkedin}"
    echo "${id},${channel},${step},${now},,,pending,send next touch,," >> data/outreach-log.csv
    echo "Logged: SENT ${step} via ${channel} to ${id}"
    ;;
  noreply)
    step="${1:-t1}"
    echo "${id},,${step},${now},${now},no_reply,advance to next touch,," >> data/outreach-log.csv
    echo "Logged: NO REPLY to ${step} from ${id}"
    ;;
  reply)
    notes="${1:-replied}"
    echo "${id},,,${now},${now},replied,manual follow-up,,,\"${notes}\"" >> data/outreach-log.csv
    echo "Logged: REPLY from ${id}"
    ;;
  interview)
    when="${1:-}"; notes="${2:-booked}"
    [[ -z "$when" ]] && when="$(date -u +%Y-%m-%d)"
    echo "${id},,,${now},${now},interview_booked,confirm + send calendar,${when},\"${notes}\"" >> data/outreach-log.csv
    echo "Logged: INTERVIEW booked for ${id} on ${when}"
    ;;
  lost)
    notes="${1:-no fit}"
    echo "${id},,,${now},${now},lost,close loop,,\"${notes}\"" >> data/outreach-log.csv
    echo "Logged: LOST — ${id} (${notes})"
    ;;
  *)
    echo "Usage: $0 {sent|noreply|reply|interview|lost} <prospect_id> [args...]" >&2
    exit 1
    ;;
esac
