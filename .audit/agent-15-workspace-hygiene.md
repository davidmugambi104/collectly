# Agent 15: Workspace hygiene

## Tests run (with verbatim output)

### Tracked vs untracked
```
409
 M .env.example
 M DEPLOY.md
 M README.md
 M launch/hackernews/README.md
 M ops/founder-content.md
 M ops/setup-keys.md
 M ops/strategy.md
 M outreach/data/seed-inbox-test-log.csv
 M outreach/data/warmup-contacts.csv
 M outreach/policy/collectly_bot_policy.md
 D outreach/queue/gog-auth-pending-2026-07-29.txt
 M package-lock.json
 M package.json
 M src/app/about/page.tsx
 M src/app/api/integrations/sync/route.ts
 M src/app/api/quickbooks/callback/route.ts
 M src/app/api/quickbooks/connect/route.ts
 M src/app/api/seed-sample/route.ts
...
?? .audit/agent-1-auth.md
?? .audit/agent-10-outreach-scripts.md
?? .audit/agent-11-replies.md
?? .audit/agent-12-deliverability.md
?? .audit/agent-13-marketing-seo.md
?? .audit/agent-2-dunning-scheduler.md
?? .audit/agent-3-dunning-ai.md
?? .audit/agent-4-inbound.md
?? .audit/agent-5-resend-inbound-webhook.md
```
- 409 tracked files
- 92 dirty entries total (modified + untracked; full list truncated)

### .gitignore
```
# dependencies
node_modules/
.pnp
.pnp.js

# next.js
.next/
out/

# production
build/
dist/

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# typescript
*.tsbuildinfo
next-env.d.ts

# database
*.db
*.sqlite
drizzle/

# logs
logs
*.log

# editor
.vscode/
.idea/
.pglite/
github.md

# Local secrets (never commit)
.creds
.env.local.save

.vercel
.cron_secret.txt
.env*
```

### Files that should be ignored but are tracked
- Tracked `.pyc` files: `13`
  - `outreach/scripts/__pycache__/check_reply_stats.cpython-312.pyc`
  - `outreach/scripts/__pycache__/daily_outreach_v2.cpython-312.pyc`
  - `outreach/scripts/__pycache__/daily_send.cpython-312.pyc`
  - `outreach/scripts/__pycache__/generate_daily_digest.cpython-312.pyc`
  - `outreach/scripts/__pycache__/generate_t1_drafts.cpython-312.pyc`
  - `outreach/scripts/__pycache__/run_seed_inbox_test.cpython-312.pyc`
  - `outreach/scripts/__pycache__/send_warmup.cpython-312.pyc`
  - `outreach/scripts/__pycache__/state.cpython-312.pyc`
  - `outreach/scripts/__pycache__/test_reply_tracking.cpython-312.pyc`
  - `outreach/scripts/clients/__pycache__/__init__.cpython-312.pyc`
  - `outreach/scripts/clients/__pycache__/apollo.cpython-312.pyc`
  - `outreach/scripts/clients/__pycache__/hunter.cpython-312.pyc`
  - `outreach/scripts/clients/__pycache__/skrapp.cpython-312.pyc`

- Env / secret / credential files tracked: `.env.example` only (this is an intentional template, not a real secret).

- Largest tracked files (bytes name):
  ```
  935053 screenshots/header-v2.png
  784368 screenshots/blog-final-notice.png
  658653 screenshots/blog-dso-playbook.png
  656033 screenshots/blog-late-payments.png
  440960 package-lock.json
  408648 screenshots/launch/og-card-1200x630.png
  408521 screenshots/blog-index-v3.png
  404713 screenshots/blog-index-v2.png
  345182 screenshots/blog-index.png
  307912 screenshots/launch/01-dashboard-overview.png
  ```

### Hardcoded credentials / secrets in scripts
```
/home/davie/.openclaw/workspace/collectly/outreach/scripts/discover_prospects.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/send-gmail.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/enrich_pipeline.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/poll_replies.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/send_t1_t2.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/resend_webhook.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/scrape_apollo_bulk.js
/home/davie/.openclaw/workspace/collectly/outreach/scripts/__pycache__/daily_send.cpython-312.pyc
/home/davie/.openclaw/workspace/collectly/outreach/scripts/clients/apollo.py
/home/davie/.openclaw/workspace/collectly/outreach/scripts/clients/__pycache__/__init__.cpython-312.pyc
```
These files contain the literal strings `password`/`secret` (variable/field names or comments). Need manual review to confirm whether real credentials are hardcoded.

### Backup tar.gz files in workspace
```
(no output)
```
- No `.tar.gz` backups found in `/home/davie`.

### Dead Python scripts (>30 days since last modification)
```
(no output)
```
- No `.py` files in `outreach/scripts` are older than 30 days.

## Best-practice search findings

1. **Gitignore secrets best practices (2026):**
   - Add `.env*` to `.gitignore` *before* first commit; if already pushed, rotate every secret and scrub git history.
   - `.env.example` is fine and encouraged as a template.
   - Use a 3-layer setup: `.gitignore`, pre-commit hooks, and environment/secrets scanning to keep API tokens out of git.

2. **Python dead-code / dead-script cleanup patterns:**
   - Tools: `albertas/deadcode`, `sen-ltd/deadcode-py`, `indiser/DeadHunt`, `light-merlin-dark/deadclean`.
   - Approach: AST-based detection with confidence tiers and allowlists for gradual CI adoption.

## What I found

- **13 tracked `.pyc` files.** `__pycache__/*.pyc` is generated bytecode and should not be in version control; the existing `.gitignore` only ignores build artifacts/logs but not `__pycache__`.
- **21 tracked binary/image assets** (PNG/GIF/etc.). Not a secret risk, but they bloat the repo (largest single file is ~935 KB). Consider storing marketing screenshots in a CDN or LFS.
- **No backup `.tar.gz` files found** in `/home/davie`.
- **No dead scripts** based on `-mtime +30`, but this only checks mtime. There may be unused scripts that are still being touched.
- **Credential grep flagged 10 files** for containing the literal strings `password`/`secret`. These need manual inspection; the presence of the strings alone does not prove a real secret leak.
- **92 dirty entries** in the working tree. The audit artifacts themselves (`.audit/agent-*.md`) are currently untracked noise if not committed or ignored.

## What should change

### High priority
1. **Remove tracked `.pyc` files** from git history and add `__pycache__/` and `*.pyc` to `.gitignore`.
2. **Manually review the 10 flagged scripts** for actual hardcoded credentials; if found, rotate secrets and scrub git history.
3. **Decide the fate of `.audit/` output**: either commit it cleanly or add `.audit/` to `.gitignore` so audit artifacts do not pollute the working tree.

### Medium priority
4. **Add or strengthen `.gitignore` patterns**: `.env*`, `*.pyc`, `__pycache__/`, `.creds`, `.cron_secret.txt` are already partially covered but `__pycache__` is missing.
5. **Consider moving large binary screenshots** out of git (CDN / Git LFS) to reduce clone size.
6. **Implement a secrets scanning pre-commit hook** (e.g., `gitleaks`, `trufflehog`) for ongoing prevention.

### Low priority
7. **Schedule periodic dead-code scans** with an AST-based tool (e.g., `deadcode`) rather than relying only on file age.

## Source / evidence

- `git ls-files | wc -l` and `git status --short` from `/home/davie/.openclaw/workspace/collectly`.
- `.gitignore` file contents shown above.
- `git ls-files | grep -c '\.pyc$'` and per-file list from `git ls-files | grep '\.pyc$'`.
- `git ls-files | xargs -I{} stat -c '%s %n' {}` for largest tracked files.
- `grep -rln 'GMAIL_APP_PASSWORD\|password\|secret' /home/davie/.openclaw/workspace/collectly/outreach/scripts/`.
- `ls -la /home/davie/*.tar.gz` (no results).
- `find /home/davie/.openclaw/workspace/collectly/outreach/scripts -name '*.py' -mtime +30` (no results).
- Web search results from DEV Community (`gitignore Done Right`), envtools.dev (`Hide .env from git`), securebin.ai, secr.dev, and Medium June 2026 article on 3-layer API-token setup.
- GitHub dead-code tool references: `albertas/deadcode`, `sen-ltd/deadcode-py`, `indiser/DeadHunt`, `light-merlin-dark/deadclean`.
