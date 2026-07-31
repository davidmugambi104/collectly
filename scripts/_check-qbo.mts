import { config } from 'dotenv';
// CRITICAL: override shell-injected QBO env vars so we read the .env.local file
config({ path: '/home/davie/.openclaw/workspace/collectly/.env.local', override: true });
console.error('DBG env.QBO_CLIENT_ID:', process.env.QBO_CLIENT_ID);
const m = await import('/home/davie/.openclaw/workspace/collectly/src/lib/integrations/quickbooks.ts');
const url = new URL(m.qboAuthUrl('test'));
console.log('URL client_id:', url.searchParams.get('client_id'));
