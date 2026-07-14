#!/usr/bin/env bash
# Pretty-print pipeline KPIs from outreach-log.csv + prospects.csv.
set -euo pipefail
cd "$(dirname "$0")/.."

# Sanity
[[ -f data/prospects.csv ]]   || { echo "Missing data/prospects.csv"; exit 1; }
[[ -f data/outreach-log.csv ]] || { echo "Missing data/outreach-log.csv"; exit 1; }

total_prospects=$(($(wc -l < data/prospects.csv) - 1))
contacts_made=$(awk -F, 'NR>1 && ($3=="t1" || $3=="t2" || $3=="t3") && $4 != "" {print}' data/outreach-log.csv | wc -l)
replies=$(awk -F, 'NR>1 && $6=="replied" {print}' data/outreach-log.csv | wc -l)
noreplies=$(awk -F, 'NR>1 && $6=="no_reply" {print}' data/outreach-log.csv | wc -l)
interviews=$(awk -F, 'NR>1 && $6=="interview_booked" {print}' data/outreach-log.csv | wc -l)
lost=$(awk -F, 'NR>1 && $6=="lost" {print}' data/outreach-log.csv | wc -l)

pct() { awk -v a="$1" -v b="$2" 'BEGIN{ if(b==0){print "n/a"}else{printf "%.0f%%",(a/b)*100} }'; }

cat <<EOF

=== Collectly Outreach Pipeline ===
Prospects in CRM:        $total_prospects
Contacts made:           $contacts_made   ($(pct "$contacts_made" "$total_prospects") of prospects)
Replies:                 $replies         ($(pct "$replies" "$contacts_made") reply rate)
No-replies logged:       $noreplies
Interviews booked:       $interviews      ($(pct "$interviews" "$replies") reply→interview)
Lost / not a fit:        $lost

Goal: 10 interviews. Currently: $interviews / 10.

EOF

# What's due today: any T1 prospect that's >3d old with no follow-up?
echo "=== Follow-ups due (T1 sent >3 days ago, no reply logged) ==="
awk -F, 'NR>1 && $3=="t1" && $4 != "" && $6=="" {
  cmd="date -d " $4 " +%s"; cmd | getline sent; close(cmd); now=systime();
  if ((now - sent) > 3*86400) print $1 " (sent " $4 ")"
}' data/outreach-log.csv || true

echo
echo "=== Recent activity (last 10 log entries) ==="
tail -n 10 data/outreach-log.csv | awk -F, 'BEGIN{OFS="  "} {
  printf "  %-22s  %-10s  %-4s  %-18s  %s\n", $4, $1, $3, $6, $8
}'
