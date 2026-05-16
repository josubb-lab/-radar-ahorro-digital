#!/usr/bin/env node
// Submit all sitemap URLs to IndexNow (Bing + Yandex, feeds Google via network)
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const KEY = 'e6508fe838ed4faa36f6c80dbd93bda6';
const HOST = 'ahorrosaas.es';
const KEY_URL = `https://${HOST}/${KEY}.txt`;

const sitemap = readFileSync(join(ROOT, 'dist/sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

console.log(`Submitting ${urls.length} URLs to IndexNow...\n`);

const endpoints = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
];

for (const endpoint of endpoints) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_URL, urlList: urls }),
  });
  console.log(`${endpoint.split('/')[2]}: HTTP ${res.status}`);
}

console.log('\nDone. URLs queued for indexing.');
