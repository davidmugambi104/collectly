// Tell Bing, Yandex and other IndexNow search engines that URLs are new or changed.
// Run after a deploy:  node scripts/indexnow.mjs            (every URL in the live sitemap)
//                      node scripts/indexnow.mjs /pricing /blog/some-post
// The key file in /public must be live first, or the engines will refuse the request.
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'mugavi.com';
const dir = new URL('../public/', import.meta.url).pathname;
const keyFile = fs.readdirSync(dir).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('No IndexNow key file in public/');
const key = path.basename(keyFile, '.txt');

let urls = process.argv.slice(2).map((p) => `https://${HOST}${p.startsWith('/') ? p : '/' + p}`);
if (urls.length === 0) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const check = await fetch(`https://${HOST}/${keyFile}`);
if (!check.ok || (await check.text()).trim() !== key) throw new Error(`Key file not live yet at https://${HOST}/${keyFile} (status ${check.status}). Deploy first.`);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} URLs, response ${res.status} ${res.statusText}`);
