/**
 * Thin Apify API runner that never logs the token.
 * Used by collectly outreach scripts.
 */
const { writeFileSync } = require('fs');

const USER_AGENT = 'collectly-outreach/1.0.0';

function getToken() {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error(
      'APIFY_TOKEN not found. Set it in your environment or in /home/user/.openclaw/secrets/collectly/APIFY_CREDS'
    );
  }
  return token;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateActorId(actorId) {
  const TECHNICAL_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  const RAW_ID = /^[a-zA-Z0-9]{17}$/;
  if (!TECHNICAL_NAME.test(actorId) && !RAW_ID.test(actorId)) {
    throw new Error(`Invalid Actor ID format: ${actorId}`);
  }
}

async function startActor(token, actorId, input) {
  validateActorId(actorId);
  const apiActorId = actorId.replace('/', '~');
  const url = `https://api.apify.com/v2/acts/${apiActorId}/runs`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': `${USER_AGENT}/start`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify start failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  return {
    runId: result.data.id,
    datasetId: result.data.defaultDatasetId,
    actorRunUrl: `https://console.apify.com/actors/runs/${result.data.id}`,
  };
}

async function pollUntilComplete(token, runId, timeoutSeconds = 600, intervalSeconds = 5) {
  const url = `https://api.apify.com/v2/actor-runs/${runId}`;
  const startTime = Date.now();
  let lastStatus = null;

  while (true) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': `${USER_AGENT}/poll`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Apify poll failed (${response.status}): ${text}`);
    }

    const result = await response.json();
    const status = result.data.status;

    if (status !== lastStatus) {
      // Only print status changes, never the token
      console.log(`Apify status: ${status}`);
      lastStatus = status;
    }

    if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      return { status, charge: result.data.usageTotalUsd || null };
    }

    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > timeoutSeconds) {
      return { status: 'TIMED-OUT', charge: null };
    }

    await sleep(intervalSeconds * 1000);
  }
}

async function downloadResults(token, datasetId) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?format=json`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': `${USER_AGENT}/download`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify download failed (${response.status}): ${text}`);
  }

  return await response.json();
}

function saveJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

module.exports = {
  getToken,
  startActor,
  pollUntilComplete,
  downloadResults,
  saveJson,
};
