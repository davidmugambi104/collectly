// Apollo login that automates the sign-in form.
// Reads credentials from /home/davie/.openclaw/secrets/collectly/APOLLO_LOGIN
// (one line: "email password") OR accepts them as args.
//
// Usage:
//   echo "you@email.com yourpassword" > /home/davie/.openclaw/secrets/collectly/APOLLO_LOGIN
//   chmod 600 /home/davie/.openclaw/secrets/collectly/APOLLO_LOGIN
//   node scrape_apollo_login.js
//
// This script:
//   1. Launches Chromium
//   2. Goes to apollo.io
//   3. Clicks the "Log In" button
//   4. Fills email + password from the secrets file
//   5. Clicks submit
//   6. Waits for the dashboard
//   7. Saves the session

const { chromium } = require("patchright");
const fs = require("fs");
const path = require("path");
const os = require("os");

const SECRET_PATH = "/home/davie/.openclaw/secrets/collectly/APOLLO_LOGIN";
const SESSION_PATH = path.join(__dirname, "apollo-session.json");

function loadCredentials() {
  // 1. Command-line args
  if (process.argv[2] && process.argv[3]) {
    return { email: process.argv[2], password: process.argv[3] };
  }
  // 2. Secrets file
  if (fs.existsSync(SECRET_PATH)) {
    const text = fs.readFileSync(SECRET_PATH, "utf-8").trim();
    const parts = text.split(/\s+/);
    if (parts.length >= 2) {
      return { email: parts[0], password: parts.slice(1).join(" ") };
    }
  }
  // 3. Env vars
  if (process.env.APOLLO_EMAIL && process.env.APOLLO_PASSWORD) {
    return { email: process.env.APOLLO_EMAIL, password: process.env.APOLLO_PASSWORD };
  }
  return null;
}

(async () => {
  const creds = loadCredentials();
  if (!creds) {
    console.error("No credentials found.");
    console.error("Either:");
    console.error("  1. Set APOLLO_EMAIL and APOLLO_PASSWORD env vars");
    console.error("  2. Or run with: node scrape_apollo_login.js you@email.com yourpassword");
    console.error("  3. Or write to /home/davie/.openclaw/secrets/collectly/APOLLO_LOGIN");
    console.error("     Format: one line, 'email password'");
    process.exit(1);
  }

  // Display setup for WSL2
  if (!process.env.DISPLAY) {
    process.env.DISPLAY = ":0";
  }

  console.log(`Logging in as: ${creds.email}`);
  console.log(`DISPLAY: ${process.env.DISPLAY}`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--start-maximized",
    ],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });
  const page = await ctx.newPage();

  // ---- Step 1: go to apollo.io ----
  console.log("Opening apollo.io...");
  await page.goto("https://www.apollo.io/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // ---- Step 2: find the login form ----
  // Apollo's home page has a "Log In" button. Click it.
  let currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);

  if (!currentUrl.includes("login") && !currentUrl.includes("sign-in")) {
    console.log("Clicking 'Log In' link...");
    // Try common selectors
    const loginLink = page
      .locator(
        'a:has-text("Log In"), a:has-text("Sign in"), button:has-text("Log In"), button:has-text("Sign in")'
      )
      .first();
    if ((await loginLink.count()) > 0) {
      await loginLink.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
    } else {
      console.log("No login link found, navigating directly to /login");
      await page.goto("https://app.apollo.io/login", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
    }
  }

  console.log(`After login click, URL: ${page.url()}`);

  // ---- Step 3: detect what kind of login form we have ----
  // Apollo's login page may use:
  //   (a) Apollo's own email/password form
  //   (b) Google sign-in redirect
  //   (c) SSO (SAML, Okta, etc.)
  const formInfo = await page.evaluate(() => {
    return {
      hasEmailInput:
        document.querySelector('input[type="email"]') !== null ||
        document.querySelector('input[name*="email" i]') !== null ||
        document.querySelector('input[placeholder*="email" i]') !== null,
      hasPasswordInput: document.querySelector('input[type="password"]') !== null,
      hasGoogleButton:
        document.body.innerText.toLowerCase().includes("sign in with google") ||
        document.querySelector('[aria-label*="google" i]') !== null,
      inputs: Array.from(document.querySelectorAll("input")).map((i) => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        id: i.id,
        visible: i.offsetWidth > 0 && i.offsetHeight > 0,
      })),
      url: window.location.href,
    };
  });
  console.log("Form detection:", JSON.stringify(formInfo, null, 2));

  // ---- Step 4: fill the form ----
  if (formInfo.hasEmailInput && formInfo.hasPasswordInput) {
    console.log("Found Apollo email/password form, filling...");

    const emailField = page
      .locator(
        'input[type="email"], input[name*="email" i], input[placeholder*="email" i]'
      )
      .first();
    await emailField.click();
    await emailField.fill(creds.email);
    await page.waitForTimeout(500);

    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.click();
    await passwordField.fill(creds.password);
    await page.waitForTimeout(500);

    // Find and click the submit button
    const submit = page
      .locator(
        'button[type="submit"], button:has-text("Log In"), button:has-text("Sign in")'
      )
      .first();
    await submit.click();
    console.log("Submitted login form");
  } else if (formInfo.hasGoogleButton) {
    console.log("");
    console.log("=== GOOGLE SIGN-IN DETECTED ===");
    console.log("Apollo is using Google sign-in, which we can't automate.");
    console.log("Two options:");
    console.log("  1. Set a password on your Apollo account (not Google-only):");
    console.log("     Go to https://app.apollo.io/ in your normal browser");
    console.log("     → Account Settings → Security → Set password");
    console.log("  2. Manually sign in: a Chrome window is open, sign in there,");
    console.log("     then press Enter.");
    console.log("");

    // Open the Google sign-in in a visible way and wait
    const googleBtn = page
      .locator(
        'button:has-text("Sign in with Google"), a:has-text("Sign in with Google"), [aria-label*="google" i]'
      )
      .first();
    if ((await googleBtn.count()) > 0) {
      await googleBtn.click();
    }
    await page.waitForTimeout(3000);

    console.log("Waiting for you to complete Google sign-in manually...");
    console.log("Press Enter in this terminal when done.");
    await new Promise((resolve) => {
      process.stdin.once("data", () => resolve());
    });
  } else {
    console.log("");
    console.log("Unknown login form. Screenshot saved to /tmp/apollo-login-unknown.png");
    await page.screenshot({ path: "/tmp/apollo-login-unknown.png", fullPage: true });
    console.log("Open that screenshot to see what the page looks like.");
    console.log("Then either:");
    console.log("  1. Manually complete the login in the browser window");
    console.log("  2. Press Enter to save whatever cookies we have");
    await new Promise((resolve) => {
      process.stdin.once("data", () => resolve());
    });
  }

  // ---- Step 5: wait for dashboard, then save session ----
  console.log("");
  console.log("Waiting for Apollo dashboard...");

  // Poll until we see the search bar or until 30s passes
  let dashboardFound = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const url = page.url();
    if (url.includes("/search") || url.includes("/dashboard") || url.includes("/people")) {
      dashboardFound = true;
      console.log(`Dashboard reached at ${url}`);
      break;
    }
    // Also check for dashboard-like content
    const hasSearchBar = await page.evaluate(() => {
      return (
        document.querySelector('input[placeholder*="search" i]') !== null ||
        document.body.innerText.includes("Apollo") ||
        document.querySelector('[data-testid*="search"]') !== null
      );
    });
    if (hasSearchBar && i > 3) {
      dashboardFound = true;
      console.log(`Dashboard detected via DOM at ${url}`);
      break;
    }
  }

  if (!dashboardFound) {
    console.log("WARNING: did not detect dashboard within 30s. Saving session anyway.");
  }

  const state = await ctx.storageState({ path: SESSION_PATH });
  console.log(`\nSession saved to ${SESSION_PATH}`);
  console.log(`Cookies: ${state.cookies.length}, Origins: ${state.origins.length}`);

  // Check for Apollo auth cookies
  const apolloCookies = state.cookies.filter(
    (c) => c.domain.includes("apollo.io") || c.domain.includes("google")
  );
  const authCookies = apolloCookies.filter(
    (c) => !c.name.startsWith("cf_") && c.name !== "__cf_bm"
  );
  console.log(`Apollo auth cookies: ${authCookies.length}`);
  if (authCookies.length === 0) {
    console.log("");
    console.log("WARNING: No Apollo auth cookies found. Login likely failed.");
    console.log("Run again and check the browser window for error messages.");
  } else {
    console.log("Auth cookie names:", authCookies.map((c) => c.name).join(", "));
  }

  await browser.close();
  process.exit(authCookies.length > 0 ? 0 : 1);
})().catch((e) => {
  console.error("FAIL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
