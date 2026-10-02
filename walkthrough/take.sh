#!/usr/bin/env bash
# One complete take from a fresh demo server: start the app on fake data, seed three overdue invoices,
# let the real scheduler draft the reminders, record, then render the preview (PREVIEW=1) or the full set.
#   ./take.sh            # 720p preview
#   FULL=1 ./take.sh     # compose the 4K master and mix (needs the music/voice stages for sound)
set -euo pipefail
cd "$(dirname "$0")"
export CHROME_PATH="${CHROME_PATH:-/usr/bin/google-chrome}" PYTHON="${PYTHON:-$HOME/.venvs/walkthrough/bin/python}"
for p in 5920 5930; do pid=$(ss -ltnp 2>/dev/null | grep ":$p " | grep -o 'pid=[0-9]*' | cut -d= -f2 || true); [ -n "$pid" ] && kill $pid 2>/dev/null || true; done
sleep 2
(./demo-server.sh > out-server.log 2>&1 &)
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:5920/ && break; sleep 2; done
for u in dashboard dashboard/invoices dashboard/dunning dashboard/inbox dashboard/integrations dashboard/reports/aged dashboard/customers; do curl -s -o /dev/null http://127.0.0.1:5920/$u; done
node seed-demo.mjs
curl -s -H "authorization: Bearer demo-trigger-secret-1234" http://127.0.0.1:5920/api/cron/dunning; echo
node run.mjs tts
rm -rf out/frames out/events.jsonl out/frames.jsonl
node run.mjs record overlays timeline
if [ -n "${FULL:-}" ]; then node run.mjs compose mix; else PREVIEW=1 node run.mjs compose; fi
