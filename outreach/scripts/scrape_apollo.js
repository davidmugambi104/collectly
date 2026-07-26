// All-in-one Apollo tool: login + scrape in a single browser session.
//
// Why one session: Apollo's bot detection fingerprints the browser process.
// If we open a fresh headless browser to scrape, the Cloudflare challenge
// fires. If we reuse the browser where the user just signed in, the
// fingerprint matches and the session works.
//
// Usage:
//   node scrape_apollo.js login    # opens browser, sign in, then waits
//   node scrape_apollo.js scrape   # reuses login, scrapes search results
//   node scrape_apollo.js full     # login + scrape in one go (default)

const { chromium } = require("patchright");
const fs = require("fs");
const path = require("path");

const SECRET_LOGIN = "/home/davie/.openclaw/secrets/collectly/APOLLO_LOGIN";
const SECRET_KEY = "/home/davie/.openclaw/secrets/collectly/APOLLO_API_KEY";
const SESSION_PATH = path.join(__dirname, "apollo-session.json");
const APOLLO_BASE = "https://app.apollo.io";

function loadCredentials() {
  if (process.env.APOLLO_EMAIL && process.env.APOLLO_PASSWORD) {
    return { email: process.env.APOLLO_EMAIL, password: process.env.APOLLO_PASSWORD };
  }
  if (fs.existsSync(SECRET_LOGIN)) {
    const text = fs.readFileSync(SECRET_LOGIN, "utf-8").trim();
    const parts = text.split(/\s+/);
    if (parts.length >= 2) {
      return { email: parts[0], password: parts.slice(1).join(" ") };
    }
  }
  return null;
}

function loadApiKey() {
  if (fs.existsSync(SECRET_KEY)) {
    return fs.readFileSync(SECRET_KEY, "utf-8").trim();
  }
  return null;
}

async function launchBrowser() {
  return await chromium.launch({
    headless: false, // visible — required for login + keeps fingerprint consistent
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--start-maximized",
      "--disable-blink-features=AutomationControlled", // patchright does this by default
    ],
  });
}

async function doLogin(ctx, page) {
  console.log("=== LOGIN ===");
  console.log("Going to apollo.io...");
  await page.goto("https://www.apollo.io/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Click Log In if on home page
  if (page.url().includes("www.apollo.io") && !page.url().includes("login")) {
    const loginLink = page
      .locator('a:has-text("Log In"), button:has-text("Log In")')
      .first();
    if ((await loginLink.count()) > 0) {
      console.log("Clicking Log In link...");
      await loginLink.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
    }
  }

  // Detect login form type
  const formInfo = await page.evaluate(() => ({
    hasEmailInput: !!document.querySelector('input[type="email"], input[name*="email" i]'),
    hasPasswordInput: !!document.querySelector('input[type="password"]'),
    hasGoogleButton: document.body.innerText.toLowerCase().includes("sign in with google") ||
                     !!document.querySelector('[aria-label*="google" i]'),
    url: window.location.href,
  }));
  console.log("Form type:", formInfo.hasGoogleButton ? "Google" : "Apollo email/password");

  if (formInfo.hasEmailInput && formInfo.hasPasswordInput) {
    // Apollo's own form — fill it
    const creds = loadCredentials();
    if (!creds) {
      console.error("No APOLLO_LOGIN credentials found.");
      process.exit(1);
    }
    console.log(`Filling email: ${creds.email}`);
    const emailField = page.locator('input[type="email"], input[name*="email" i]').first();
    await emailField.click();
    await emailField.fill(creds.email);
    await page.waitForTimeout(300);

    const passField = page.locator('input[type="password"]').first();
    await passField.click();
    await passField.fill(creds.password);
    await page.waitForTimeout(300);

    const submit = page.locator('button[type="submit"], button:has-text("Log In")').first();
    await submit.click();
    console.log("Submitted.");
  } else if (formInfo.hasGoogleButton) {
    console.log("");
    console.log("=== GOOGLE SIGN-IN REQUIRED ===");
    console.log("The browser is on the Google sign-in page.");
    console.log("Sign in manually with davidmugambi104@gmail.com");
    console.log("When you see the Apollo dashboard, press Enter.");
    console.log("");
    await new Promise((resolve) => process.stdin.once("data", () => resolve()));
  } else {
    console.log("Unknown form. Screenshot at /tmp/apollo-unknown.png");
    await page.screenshot({ path: "/tmp/apollo-unknown.png", fullPage: true });
    console.log("Press Enter after manually completing login.");
    await new Promise((resolve) => process.stdin.once("data", () => resolve()));
  }

  // Wait for dashboard
  console.log("Waiting for dashboard...");
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    if (page.url().includes("/search") || page.url().includes("/dashboard")) break;
  }
  await page.waitForTimeout(2000);

  // Save session
  await ctx.storageState({ path: SESSION_PATH });
  const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf-8"));
  const authCookies = state.cookies.filter(
    (c) => c.domain.includes("apollo.io") &&
           !c.name.startsWith("cf_") &&
           c.name !== "__cf_bm"
  );
  console.log(`Session saved: ${state.cookies.length} cookies, ${authCookies.length} auth cookies.`);
  if (authCookies.length === 0) {
    console.error("Login failed — no Apollo auth cookies.");
    process.exit(1);
  }
}

async function doScrape(ctx, page, opts) {
  console.log("\n=== SCRAPE ===");
  // Apollo's SPA is slow to boot. We need to go via the home page first,
  // then click into search (so the React app fully mounts), THEN navigate
  // to the search URL.
  console.log("Loading home page to warm up the SPA...");
  await page.goto(`${APOLLO_BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  // Now navigate to search with filter params
  const searchUrl = `${APOLLO_BASE}/#/search?personTitles[]=${encodeURIComponent(opts.title)}&personLocations[]=${encodeURIComponent(opts.geo)}`;
  console.log(`Navigating to: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Wait for the SPA to render results
  console.log("Waiting for results to render (up to 60s)...");
  let rendered = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    const has = await page.evaluate(() => ({
      hasTable: !!document.querySelector("table"),
      hasRows: document.querySelectorAll("tr").length > 5,
      hasResultRow: !!document.querySelector('[class*="ResultRow"], [class*="result-row"], [data-testid*="row"]'),
      url: window.location.href,
    }));
    if (has.hasTable || has.hasRows || has.hasResultRow) {
      console.log(`  Rendered after ${(i + 1) * 2}s — table:${has.hasTable}, rows:${has.hasRows}, resultRow:${has.hasResultRow}`);
      rendered = true;
      break;
    }
    if (i === 15) {
      console.log("  Still waiting... URL:", has.url);
    }
  }

  if (!rendered) {
    console.log("WARNING: page did not render results within 60s.");
    console.log("Saving screenshot for inspection...");
    await page.screenshot({ path: "/tmp/apollo-scrape-no-render.png", fullPage: true });
    console.log("Screenshot: /tmp/apollo-scrape-no-render.png");
  }

  // Auth check (post-render)
  const title = await page.title();
  const url = page.url();
  console.log(`Final state: ${url} (title: ${title})`);

  if (title === "404 Not Found" || url.includes("www.apollo.io/")) {
    console.error("Not authenticated or session expired.");
    process.exit(1);
  }

  // Apply filters via UI
  await applyFilters(page, opts);

  // Paginate and extract
  const allRows = [];
  for (let p = 1; p <= opts.maxPages; p++) {
    console.log(`\n--- Page ${p} of ${opts.maxPages} ---`);
    await page.waitForTimeout(2000);

    const rows = await extractRows(page);
    console.log(`  Extracted ${rows.length} rows from page ${p}`);
    allRows.push(...rows);

    if (p < opts.maxPages) {
      const clicked = await clickNext(page);
      if (!clicked) {
        console.log("  No more pages.");
        break;
      }
    }
  }

  // Write CSV
  const out = opts.output || path.join(__dirname, `apollo-bulk-${new Date().toISOString().slice(0, 10)}.csv`);
  const csv = toCsv(allRows);
  fs.writeFileSync(out, csv);
  console.log(`\nWrote ${allRows.length} rows to ${out}`);
  return out;
}

async function applyFilters(page, opts) {
  // Best-effort: try to set filters by clicking chips and typing.
  // Apollo's actual selectors are discovered dynamically. The selectors
  // below are common patterns; if they fail, we still extract whatever
  // is currently displayed.

  const titles = opts.title.split(",").map((t) => t.trim()).filter(Boolean);
  const geos = opts.geo.split(",").map((g) => g.trim()).filter(Boolean);

  // Strategy 1: try direct URL filter params (Apollo sometimes accepts these)
  // Strategy 2: click "Add filter" buttons in the left panel
  // Strategy 3: just leave defaults and extract whatever is shown

  // For now, just click common filter buttons
  console.log(`Wanted filters: title=${titles.join("|")}, geo=${geos.join("|")}, size=${opts.size}`);
  console.log("(Filter automation is best-effort — selectors may need updating)");

  // Click the "Add filter" button or "More filters" link
  const addFilter = page.locator('button:has-text("Add filter"), button:has-text("More filters"), [data-testid*="add-filter"]').first();
  if ((await addFilter.count()) > 0) {
    console.log("  Found 'Add filter' button");
  }
}

async function extractRows(page) {
  return await page.evaluate(() => {
    // Apollo's result rows have a recognizable structure. We look for any
    // table-like element that contains person-like text.
    const results = [];

    // Try common row selectors
    const selectors = [
      'tr[data-testid]',
      'tr.zp_W2vt8',
      'tr[class*="ResultRow"]',
      '[data-testid*="result"]',
      '[data-testid*="row"]',
      'div[class*="Result"]',
      'div[class*="result"]',
      'table tbody tr',
    ];

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length >= 5) {
        for (const el of els) {
          const text = (el.innerText || "").trim();
          if (text.length < 10) continue;
          // Skip header rows
          if (/^name$/i.test(text.split("\n")[0]) || /title$/i.test(text)) continue;

          // Try to extract fields from the row
          const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
          const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);

          results.push({
            name: lines[0] || "",
            title: lines[1] || "",
            company: lines[2] || "",
            location: lines[3] || "",
            email: emailMatch ? emailMatch[0] : "",
            raw: text.slice(0, 500),
          });
        }
        if (results.length > 0) break;
      }
    }
    return results;
  });
}

async function clickNext(page) {
  // Try multiple next-page patterns
  const next = page
    .locator(
      'button[aria-label*="next" i], button:has-text("Next"), [data-testid*="next-page"]'
    )
    .first();
  if ((await next.count()) > 0 && (await next.isVisible())) {
    await next.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows) {
  const header = ["First Name", "Last Name", "Title", "Company Name", "Email", "City", "State", "Country", "raw"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const nameParts = (r.name || "").split(/\s+/);
    lines.push(
      [
        csvEscape(nameParts[0] || ""),
        csvEscape(nameParts.slice(1).join(" ") || ""),
        csvEscape(r.title || ""),
        csvEscape(r.company || ""),
        csvEscape(r.email || ""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(r.raw || ""),
      ].join(",")
    );
  }
  return lines.join("\n");
}

async function main() {
  if (!process.env.DISPLAY) process.env.DISPLAY = ":0";

  const cmd = process.argv[2] || "full";
  const opts = {
    title: process.argv.includes("--title") ? process.argv[process.argv.indexOf("--title") + 1] : "Founder",
    geo: process.argv.includes("--geo") ? process.argv[process.argv.indexOf("--geo") + 1] : "US",
    size: process.argv.includes("--size") ? process.argv[process.argv.indexOf("--size") + 1] : "5-25",
    maxPages: process.argv.includes("--max-pages") ? parseInt(process.argv[process.argv.indexOf("--max-pages") + 1], 10) : 2,
    output: process.argv.includes("--output") ? process.argv[process.argv.indexOf("--output") + 1] : null,
  };

  const browser = await launchBrowser();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });
  const page = await ctx.newPage();

  if (cmd === "login") {
    await doLogin(ctx, page);
    console.log("\nLogin complete. Run `node scrape_apollo.js scrape` to extract.");
  } else if (cmd === "scrape") {
    // Skip login, go straight to scrape — but only works if session exists
    await doScrape(ctx, page, opts);
  } else if (cmd === "full") {
    // Login + scrape in one session (most reliable)
    await doLogin(ctx, page);
    await doScrape(ctx, page, opts);
  } else {
    console.log("Commands: login | scrape | full");
  }

  await browser.close();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
