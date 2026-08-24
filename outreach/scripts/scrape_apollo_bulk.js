// Apollo bulk scraper using Patchright (undetected Chromium).
//
// Workflow:
//   1. node scrape_apollo_bulk.js login
//      → Opens Chromium, you sign in to Apollo manually, then press Enter in the terminal.
//      → Saves the session (cookies + localStorage) to apollo-session.json
//
//   2. node scrape_apollo_bulk.js scrape [options]
//      → Loads the saved session
//      → Navigates to /search with the filters you specify
//      → Paginates through all 25-result pages
//      → Writes leads to apollo-export-YYYY-MM-DD.csv
//
// Usage examples:
//   node scrape_apollo_bulk.js login
//   node scrape_apollo_bulk.js scrape --title Founder --geo US --size 5-25 --max-pages 4
//   node scrape_apollo_bulk.js scrape --title "Founder,CEO" --geo "US,UK" --size 5-50 --max-pages 20
//
// Output CSV columns match Apollo's UI export schema so they drop into enrich_pipeline.py.

const { chromium } = require("patchright");
const fs = require("fs");
const path = require("path");

const SESSION_PATH = path.join(__dirname, "apollo-session.json");
const APOLLO_BASE = "https://app.apollo.io";
const APOLLO_SEARCH = `${APOLLO_BASE}/search`;

// ---------- login ----------

async function login() {
  const browser = await chromium.launch({
    headless: false, // we need to SEE the browser so you can sign in
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--start-maximized",  // open maximized so it's impossible to miss
    ],
  });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto("https://www.apollo.io/", { waitUntil: "domcontentloaded" });

  // Try to bring the window to the front
  try { await page.bringToFront(); } catch {}

  console.log("\n=== APOLLO LOGIN ===");
  console.log("A Chrome window opened MAXIMIZED to https://www.apollo.io/");
  console.log("");
  console.log("In the browser window:");
  console.log("  1. Click 'Log In' (top-right corner of the page)");
  console.log("  2. Enter your Apollo email and password");
  console.log("  3. Click 'Log In' to submit");
  console.log("  4. WAIT until you see the Apollo dashboard");
  console.log("       (search bar visible, your name/avatar in the top corner)");
  console.log("  5. Come back to THIS terminal");
  console.log("  6. Press ENTER to save the session");
  console.log("");
  console.log("If you see a captcha or 'verify you're human', complete it first.");
  console.log("If the browser window is not visible, check your taskbar / alt-tab to it.");
  console.log("");

  // Wait for user input
  await new Promise((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Snapshot the storage state
  const state = await ctx.storageState({ path: SESSION_PATH });
  console.log(`\nSession saved to ${SESSION_PATH}`);
  console.log(`Cookies: ${state.cookies.length}, Origins: ${state.origins.length}`);

  if (state.cookies.length <= 2) {
    console.log("\nWARNING: Only", state.cookies.length, "cookies saved.");
    console.log("If you didn't see the Apollo dashboard before pressing Enter,");
    console.log("the session is incomplete. Re-run login and wait for the dashboard.");
  }

  await browser.close();
  process.exit(0);
}

// ---------- scrape ----------

function parseArgs(argv) {
  const args = {
    title: "Founder",
    geo: "US",
    size: "5-25",
    industry: null,
    maxPages: 4,
    output: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case "--title": args.title = v; i++; break;
      case "--geo": args.geo = v; i++; break;
      case "--size": args.size = v; i++; break;
      case "--industry": args.industry = v; i++; break;
      case "--max-pages": args.maxPages = parseInt(v, 10); i++; break;
      case "--output": args.output = v; i++; break;
      case "-h":
      case "--help":
        console.log(
          "Usage: node scrape_apollo_bulk.js scrape " +
            "[--title <titles,csv>] [--geo <countries,csv>] [--size <range>] " +
            "[--industry <name>] [--max-pages <n>] [--output <path>]"
        );
        process.exit(0);
    }
  }
  return args;
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function scrape() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(SESSION_PATH)) {
    console.error(`No session at ${SESSION_PATH}. Run: node scrape_apollo_bulk.js login`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const ctx = await browser.newContext({
    storageState: SESSION_PATH,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  // Build the search URL. Apollo uses URL params on /search to encode filters.
  // We start at /search#recommended? but it's actually filter-driven via the
  // panel. The cleanest path: navigate, then drive the panel via DOM clicks.
  // For speed we use Apollo's saved-search URL params that they accept.
  const titles = args.title.split(",").map((t) => t.trim()).filter(Boolean);
  const geos = args.geo.split(",").map((g) => g.trim()).filter(Boolean);

  // The /search page is SPA; filters live in the panel. The fastest scrape is:
  //   1. go to /search
  //   2. set filter values via clicks/text input
  //   3. wait for results
  //   4. extract rows from the table
  //   5. click "next page" until exhausted or max-pages hit
  console.log(`Navigating to ${APOLLO_SEARCH}...`);
  await page.goto(APOLLO_SEARCH, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // If we're not on /search, force it
  if (!page.url().includes("/search")) {
    await page.goto(APOLLO_SEARCH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  }

  // Apply filters. Apollo's UI is dynamic; the selectors are best-effort
  // against the public web app. If the UI changes, the selectors will need
  // updating.
  console.log(`Applying filters: title=${titles.join("|")} geo=${geos.join("|")} size=${args.size}`);

  // Title filter: click the Job Title filter chip, type each title, press Enter
  try {
    await page.locator('[data-testid="job-title-filter"]').first().click({ timeout: 5000 });
  } catch {
    console.warn("  (couldn't click Job Title filter chip — UI may have changed)");
  }
  await page.waitForTimeout(500);
  for (const t of titles) {
    const input = page.locator('input[placeholder*="title" i], input[placeholder*="job" i]').first();
    if (await input.count() > 0) {
      await input.fill(t);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
    }
  }
  // Click outside to close the dropdown
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Location filter
  try {
    await page.locator('[data-testid="location-filter"]').first().click({ timeout: 5000 });
  } catch {
    console.warn("  (couldn't click Location filter chip)");
  }
  await page.waitForTimeout(500);
  for (const g of geos) {
    const input = page.locator('input[placeholder*="location" i], input[placeholder*="country" i]').first();
    if (await input.count() > 0) {
      await input.fill(g);
      await page.waitForTimeout(400);
      // pick the suggestion
      const opt = page.locator(`text="${g}"`).first();
      if (await opt.count() > 0) await opt.click();
      await page.waitForTimeout(400);
    }
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Company size filter
  try {
    await page.locator('[data-testid="company-size-filter"]').first().click({ timeout: 5000 });
  } catch {
    console.warn("  (couldn't click Company Size filter chip)");
  }
  await page.waitForTimeout(500);
  // Apollo UI uses chips like "1-10, 11-20, 21-50, 51-100, 101-200, 201-500, 501-1000, 1001+"
  // We map our "5-25" input to the closest matches.
  const sizeChips = (() => {
    const [lo, hi] = args.size.split("-").map((n) => parseInt(n, 10));
    const chips = [];
    if (lo <= 10 || hi <= 10) chips.push("1-10");
    if (lo <= 20 && hi >= 11) chips.push("11-20");
    if (lo <= 50 && hi >= 21) chips.push("21-50");
    if (hi >= 51) chips.push("51-100");
    return chips;
  })();
  for (const chip of sizeChips) {
    const btn = page.locator(`button:has-text("${chip}")`).first();
    if (await btn.count() > 0) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);

  // Wait for results to load
  console.log("Waiting for results...");
  await page.waitForTimeout(3000);

  // Extract rows
  const allRows = [];
  for (let p = 1; p <= args.maxPages; p++) {
    console.log(`\n--- Page ${p} of ${args.maxPages} ---`);
    const rows = await page.evaluate(() => {
      // Apollo renders results in a table. Each row has class names like
      // "zp_W2vt8" or data-testid attributes. The exact selectors are
      // version-dependent. Best-effort: grab all visible rows that look
      // like person records.
      const result = [];
      // Try a few common selectors
      const candidates = document.querySelectorAll(
        'tr[data-testid^="row"], tr.zp_W2vt8, tr[class*="ResultRow"], [data-testid="table-row"]'
      );
      const seen = new Set();
      candidates.forEach((row) => {
        if (seen.has(row)) return;
        seen.add(row);
        // Try to extract: name, title, company, email
        const cells = row.querySelectorAll("td");
        // First cell often has the name + title + company
        const main = row.querySelector("td:first-child") || row;
        const allText = main.innerText || "";
        // Best-effort: pull email via Apollo's small icon (the "i" icon
        // reveals emails; we just look for any string matching email shape
        // in the rendered DOM, which works only on certain Apollo plans)
        const emailMatch = allText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
        result.push({
          rowText: allText,
          email: emailMatch ? emailMatch[0] : "",
          cellCount: cells.length,
        });
      });
      return result;
    });
    console.log(`  Extracted ${rows.length} candidate rows`);
    allRows.push(...rows);

    // Click "next page" if not the last iteration
    if (p < args.maxPages) {
      const nextBtn = page
        .locator('button[aria-label*="next" i], button:has-text("Next"), [data-testid*="next"]')
        .first();
      if ((await nextBtn.count()) > 0) {
        await nextBtn.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(2500);
      } else {
        console.log("  No next-page button; stopping");
        break;
      }
    }
  }

  await browser.close();

  // Write CSV
  const out = args.output || path.join(__dirname, `apollo-bulk-${new Date().toISOString().slice(0, 10)}.csv`);
  const header = [
    "First Name", "Last Name", "Title", "Company Name", "Email",
    "Person Linkedin Url", "Website", "City", "State", "Country",
    "# Employees", "Industry", "raw_text",
  ];
  const lines = [header.join(",")];
  for (const r of allRows) {
    // Best-effort parsing of the row text into fields
    const text = (r.rowText || "").replace(/\n+/g, " | ").trim();
    // Apollo rows are typically: "Name\nTitle\nCompany\nLocation"
    const parts = text.split("|").map((p) => p.trim());
    lines.push(
      [
        csvEscape(parts[0] || ""), // First Name (full name, will split later)
        csvEscape(""),
        csvEscape(parts[1] || ""), // Title
        csvEscape(parts[2] || ""), // Company
        csvEscape(r.email || ""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(parts[3] || ""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(text),
      ].join(",")
    );
  }
  fs.writeFileSync(out, lines.join("\n"));
  console.log(`\nWrote ${allRows.length} rows to ${out}`);
  console.log("Note: this is a raw extract. Run enrich_pipeline.py enrich to fill emails and verify.");
  process.exit(0);
}

// ---------- dispatch ----------

(async () => {
  const cmd = process.argv[2];
  if (cmd === "login") {
    await login();
  } else if (cmd === "scrape") {
    await scrape();
  } else {
    console.log("Usage:");
    console.log("  node scrape_apollo_bulk.js login    # one-time manual sign-in");
    console.log("  node scrape_apollo_bulk.js scrape [options]");
    process.exit(1);
  }
})();
