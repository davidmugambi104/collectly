#!/usr/bin/env node
/**
 * Collectly Apify lead sourcer — uses APPROVED actor logiover/b2b-lead-scraper.
 *
 * Queries the Apify actor, collects raw results, and writes them to a JSON file
 * for further processing (ICP filter, headcount verification, CSV append).
 *
 * Usage:
 *   node outreach/scripts/apify_lead_source.js \
 *     --city "Phoenix" --country "United States" --sector "bookkeeping" --max-leads 20 \
 *     --output /tmp/apify_run_phoenix_bookkeeping.json
 */

const { writeFileSync, existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const {
  getToken,
  startActor,
  pollUntilComplete,
  downloadResults,
  saveJson,
} = require('./lib/apify_runner');

const ACTOR_ID = 'logiover/b2b-lead-scraper';

function parseCliArgs() {
  const { values } = require('node:util').parseArgs({
    options: {
      city: { type: 'string', short: 'c' },
      country: { type: 'string', short: 'C', default: 'United States' },
      sector: { type: 'string', short: 's' },
      'max-leads': { type: 'string', short: 'm', default: '20' },
      output: { type: 'string', short: 'o' },
      timeout: { type: 'string', short: 't', default: '300' },
    },
    allowPositionals: false,
  });

  if (!values.city || !values.sector) {
    console.error('Error: --city and --sector are required');
    process.exit(1);
  }

  return {
    city: values.city,
    country: values.country,
    sector: values.sector,
    maxLeads: parseInt(values['max-leads'], 10),
    output: values.output,
    timeout: parseInt(values.timeout, 10),
  };
}

async function main() {
  const args = parseCliArgs();

  // Load token from secrets file if not in env
  if (!process.env.APIFY_TOKEN && !process.env.APIFY_API_TOKEN) {
    const secretsPath = '/home/user/.openclaw/secrets/collectly/APIFY_CREDS';
    if (existsSync(secretsPath)) {
      const content = readFileSync(secretsPath, 'utf-8');
      const match = content.match(/APIFY_API_TOKEN=([^\s]+)/);
      if (match) process.env.APIFY_TOKEN = match[1];
    }
  }

  const token = getToken();
  console.log(`Sourcing: "${args.sector}" in ${args.city}, ${args.country} (maxLeads ${args.maxLeads})`);

  const apifyInput = {
    sector: args.sector,
    country: args.country,
    cities: [args.city],
    maxLeads: args.maxLeads,
    verifyEmails: true,
    requireEmail: true,
  };

  const { runId, datasetId, actorRunUrl } = await startActor(token, ACTOR_ID, apifyInput);
  console.log(`Apify run started: ${actorRunUrl}`);

  const { status, charge } = await pollUntilComplete(token, runId, args.timeout);
  if (status !== 'SUCCEEDED') {
    console.error(`Apify run ended with status: ${status}`);
    process.exit(1);
  }

  console.log(`Apify run succeeded. Charge: $${charge ?? 'unknown'}`);

  const allResults = await downloadResults(token, datasetId);
  console.log(`Downloaded ${allResults.length} raw records`);

  const outputPath = args.output
    ? resolve(process.cwd(), args.output)
    : resolve(process.cwd(), `outreach/data/apify-runs/${new Date().toISOString().split('T')[0]}_${args.city}_${args.sector}.json`.replace(/\s+/g, '_').toLowerCase());

  saveJson(outputPath, allResults);
  console.log(`Raw JSON saved: ${outputPath}`);

  // Print summary
  const withEmail = allResults.filter(r => r.companyEmails && r.companyEmails.length > 0).length;
  const withDomain = allResults.filter(r => r.domain).length;
  console.log(`Summary: ${allResults.length} total, ${withDomain} with domain, ${withEmail} with email`);
  if (charge) console.log(`Run cost: $${charge}`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});