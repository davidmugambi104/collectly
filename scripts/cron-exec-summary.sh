#!/bin/bash
BASE_URL="${COLLECTLY_BASE_URL:-http://localhost:3030}"
curl -fsS -m 10 "$BASE_URL/api/exec-summary" 2>&1 | head -1
