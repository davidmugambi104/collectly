# Collectly Apify Lead Pipeline

Builds B2B prospect lists from Google Maps using Apify. Safe, public-data only.

## What it does

1. Searches Google Maps for a profession in a city/country.
2. Downloads all results from Apify.
3. Filters out closed businesses and businesses without websites.
4. Dedups by domain.
5. Outputs a `prospects.csv`-compatible file with empty `email`, `linkedin_url`, etc.
6. Saves optional raw JSON.

## Usage

```bash
cd /home/user/.openclaw/workspace/collectly

# 30 marketing agencies in Austin, US
node outreach/scripts/apify_build_list.js \
  -c "Austin" -C US -p "marketing agency" -l 30

# 20 bookkeepers in Manchester, UK
node outreach/scripts/apify_build_list.js \
  -c "Manchester" -C GB -p "bookkeeping" -l 20

# Custom output path
node outreach/scripts/apify_build_list.js \
  -c "Denver" -C US -p "branding agency" -l 50 \
  -o outreach/data/apify-denver-branding.csv \
  -r /tmp/apify-denver-raw.json
```

## Cost estimate

Apify Google Maps scraper pricing (free tier):

- Actor start: ~$0.007/run
- Place scraped: ~$0.004/place
- We disable reviews and images to keep cost low.

Example: 100 places ≈ $0.41 USD.

## Current blocker

The free Apify credit was exhausted during initial testing. To use this pipeline,
add a payment method at https://console.apify.com/billing or wait for the next
billing cycle.

## Security note

The Apify token was printed in a verbose curl output earlier. Rotate it at
https://console.apify.com/account/integrations after you finish testing.

## Next steps after generating a list

1. Enrich domains with Hunter.io or Apollo to find decision-maker emails.
2. Validate emails before sending.
3. Add validated leads to `outreach/data/prospects.csv`.
4. Run your existing outreach sequences.

## Output format

Matches `outreach/data/prospects.csv`:

```csv
id,first_name,last_name,company,role,country,team_size,industry,linkedin_url,email,source,notes,hook,tier
```

`email`, `linkedin_url`, `first_name`, `last_name`, and `role` are left empty
until enrichment.
