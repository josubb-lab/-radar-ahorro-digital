#!/usr/bin/env node
// Tier-2: pings todas las URLs parásitas a Wayback Machine + servicios XML-RPC
// Uso: node scripts/tier2.js
// Resumable: salta URLs ya procesadas en outreach/tier2-results.json
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const URLS_FILE = join(ROOT, 'outreach/tier2-urls.txt');
const RESULTS_FILE = join(ROOT, 'outreach/tier2-results.json');

const PING_SERVICES = [
  'http://rpc.pingomatic.com/',
  'http://blogsearch.google.com/ping/RPC2',
  'http://ping.blogs.yam.com/',
  'http://ping.feedburner.com/',
  'http://rpc.weblogs.com/RPC2',
  'http://ping.syndic8.com/xmlrpc.php',
  'http://www.blogsnow.com/ping',
  'http://www.blogdigger.com/RPC2',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const pingXmlRpc = async (service, name, url) => {
  const body = `<?xml version="1.0"?><methodCall><methodName>weblogUpdates.ping</methodName><params><param><value><string>${name}</string></value></param><param><value><string>${url}</string></value></param></params></methodCall>`;
  try {
    const res = await fetch(service, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? 'ok' : `http:${res.status}`;
  } catch (e) {
    return `err`;
  }
};

const saveWayback = async (url) => {
  try {
    const res = await fetch(`https://web.archive.org/save/${url}`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; archive-bot)' },
      signal: AbortSignal.timeout(30000),
      redirect: 'follow',
    });
    return res.ok || res.status === 302 || res.status === 301 ? 'saved' : `http:${res.status}`;
  } catch (e) {
    return `err`;
  }
};

async function main() {
  const urls = readFileSync(URLS_FILE, 'utf8').split('\n').filter(Boolean);
  const results = existsSync(RESULTS_FILE)
    ? JSON.parse(readFileSync(RESULTS_FILE, 'utf8'))
    : {};
  const pending = urls.filter(u => !results[u]);

  console.log(`Total: ${urls.length} | Ya procesadas: ${urls.length - pending.length} | Pendientes: ${pending.length}\n`);

  for (let i = 0; i < pending.length; i++) {
    const url = pending[i];
    const name = decodeURIComponent(url.split('/').pop()?.replace(/-/g, ' ') ?? 'AhorroSaaS');
    process.stdout.write(`[${i + 1}/${pending.length}] ${url.slice(0, 65)}\n  → wayback... `);

    const result = { ts: new Date().toISOString(), wayback: null, pings: {} };

    result.wayback = await saveWayback(url);
    process.stdout.write(`${result.wayback}\n`);
    await sleep(2000);

    for (const svc of PING_SERVICES) {
      const label = new URL(svc).hostname.replace('www.', '');
      result.pings[label] = await pingXmlRpc(svc, name, url);
      process.stdout.write(`  → ping ${label}: ${result.pings[label]}\n`);
      await sleep(600);
    }

    results[url] = result;
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log('');
    await sleep(3000);
  }

  const saved = Object.values(results).filter(r => r.wayback === 'saved').length;
  const ok = Object.values(results).flatMap(r => Object.values(r.pings)).filter(v => v === 'ok').length;
  console.log(`\n✓ Completado. Wayback: ${saved}/${urls.length} guardadas. Pings ok: ${ok}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
