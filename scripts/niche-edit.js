#!/usr/bin/env node
// Niche edit automático (link exchange, gratis)
// Modos:
//   --prospect   busca prospectos en DuckDuckGo y extrae emails → outreach/prospects.csv
//   --send       envía emails (requiere GMAIL_USER y GMAIL_PASS en .env o env vars)
//   --limit N    máximo de queries a procesar (default: 30)
//   --dry        simula sin enviar emails

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUERIES_FILE = join(ROOT, 'outreach/niche-edit-queries.txt');
const PROSPECTS_FILE = join(ROOT, 'outreach/prospects_clean.csv');
const SENT_FILE = join(ROOT, 'outreach/sent.json');

const MODE_PROSPECT = process.argv.includes('--prospect');
const MODE_SEND = process.argv.includes('--send');
const MODE_TEST = process.argv.includes('--test');
const DRY = process.argv.includes('--dry');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1]) : 30;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Scraping ────────────────────────────────────────────────────────────────

// Google Custom Search API (100 queries/día gratis)
// Setup: https://console.cloud.google.com → habilitar Custom Search API
//        https://cse.google.com → crear buscador "toda la web" → obtener CX
// Variables: GOOGLE_CSE_KEY y GOOGLE_CSE_CX
const GOOGLE_KEY = process.env.GOOGLE_CSE_KEY;
const GOOGLE_CX  = process.env.GOOGLE_CSE_CX;

async function searchGoogle(query) {
  if (!GOOGLE_KEY || !GOOGLE_CX) return null;
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&lr=lang_es&num=10`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) { console.error(`  Google CSE error: ${res.status} — usando DuckDuckGo`); return null; }
    const data = await res.json();
    return (data.items ?? []).map(i => i.link).filter(Boolean);
  } catch (e) {
    console.error(`  Google CSE err: ${e.message} — usando DuckDuckGo`);
    return null;
  }
}

async function searchDDG(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=es-es`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const links = [];
    // Extract organic result URLs from result__url spans (display text like "example.com/path")
    const re = /class="result__url"[^>]*>\s*([^\s<][^<]*?)\s*<\/a>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      let raw = m[1].trim();
      if (!raw.startsWith('http')) raw = 'https://' + raw;
      try { new URL(raw); links.push(raw); } catch { /* invalid */ }
    }
    return links.slice(0, 10);
  } catch (e) {
    console.error(`  DDG err: ${e.message}`);
    return [];
  }
}

async function search(query) {
  if (GOOGLE_KEY && GOOGLE_CX) {
    const results = await searchGoogle(query);
    if (results !== null && results.length > 0) return results;
  }
  await sleep(1000);
  return searchDDG(query);
}

async function extractEmails(url) {
  const emails = new Set();
  const pagesToCheck = [url, `${new URL(url).origin}/contact`, `${new URL(url).origin}/contacto`, `${new URL(url).origin}/about`];
  for (const page of pagesToCheck) {
    try {
      const res = await fetch(page, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const found = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
      found
        .filter(e => !e.includes('sentry') && !e.includes('example') && !e.includes('schema') && !e.includes('wpcf'))
        .forEach(e => emails.add(e.toLowerCase()));
      if (emails.size) break;
    } catch { /* skip */ }
    await sleep(800);
  }
  return [...emails];
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

// ── Outreach email ───────────────────────────────────────────────────────────

function buildEmail(prospect) {
  const topic = prospect.query.replace(/ recomendación| inurl.*|-site.*/gi, '').trim();
  const subject = `Tu artículo sobre ${topic} — enlace desde AhorroSaaS`;
  const body = `Hola,

He leído tu contenido sobre "${topic}" — buen trabajo, especialmente la parte práctica.

Gestiono AhorroSaaS (ahorrosaas.es), un comparador de herramientas SaaS para pequeños negocios en español. Tenemos guías y análisis sobre ${topic} con precios reales y comparativas actualizadas.

¿Te interesaría añadir un enlace a nuestro contenido en tu artículo donde encaje de forma natural? A cambio, yo haría lo mismo desde uno de nuestros posts relacionados.

Si no encaja, sin problema — lo entiendo perfectamente.

Un saludo,
Josue
josue@benchdatalab.com | ahorrosaas.es`;
  return { subject, body };
}

// ── Modos ────────────────────────────────────────────────────────────────────

async function runProspect() {
  const queries = readFileSync(QUERIES_FILE, 'utf8').split('\n').filter(Boolean);
  const existing = existsSync(PROSPECTS_FILE)
    ? new Set(readFileSync(PROSPECTS_FILE, 'utf8').split('\n').map(l => l.split(',')[0]?.replace(/"/g, '')))
    : new Set();

  if (!existsSync(PROSPECTS_FILE)) {
    writeFileSync(PROSPECTS_FILE, 'domain,email,url,query,category,found_at\n');
  }

  const batch = queries.slice(0, LIMIT);
  console.log(`Procesando ${batch.length} queries (de ${queries.length} totales)\n`);
  let found = 0;

  for (let i = 0; i < batch.length; i++) {
    const query = batch[i];
    const category = query.match(/"([^"]+)"/)?.[ 1] ?? '';
    process.stdout.write(`[${i + 1}/${batch.length}] ${query.slice(0, 70)}\n`);

    const urls = await search(query);
    process.stdout.write(`  → ${urls.length} resultados\n`);

    for (const url of urls.slice(0, 5)) {
      let domain;
      try { domain = new URL(url).hostname; } catch { continue; }
      if (existing.has(domain)) continue;

      const emails = await extractEmails(url);
      if (!emails.length) continue;

      for (const email of emails.slice(0, 2)) {
        const row = [domain, email, url, query.slice(0, 80), category, new Date().toISOString()].map(csvEscape).join(',');
        appendFileSync(PROSPECTS_FILE, row + '\n');
        existing.add(domain);
        found++;
        console.log(`  ✓ ${domain} — ${email}`);
      }
      await sleep(1500);
    }

    await sleep(3000 + Math.random() * 2000);
  }

  console.log(`\n✓ Prospectos nuevos encontrados: ${found}`);
  console.log(`Archivo: outreach/prospects.csv`);
}

async function runSend() {
  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    console.error('Instala nodemailer: npm install nodemailer --save-dev');
    process.exit(1);
  }

  const GMAIL_USER = process.env.GMAIL_USER || 'josue@benchdatalab.com';
  const GMAIL_PASS = process.env.GMAIL_PASS;
  if (!GMAIL_PASS) {
    console.error('Necesitas: GMAIL_PASS=app-password node scripts/niche-edit.js --send');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  const SKIP_DOMAINS_SEND = new Set([
    'brevo.com','hostinger.com','mailerlite.com','getresponse.com','beehiiv.com',
    'ahrefs.com','semrush.com','wpbeginner.com','hootsuite.com','mailchimp.com',
    'convertkit.com','kit.com','activecampaign.com','hubspot.com','pipedrive.com',
    'notion.so','zapier.com','make.com','n8n.io','systeme.io','acumbamail.com',
    'mdirector.com','billionverify.com','seobility.net','aioseo.com','upnify.com',
  ]);

  const sent = existsSync(SENT_FILE) ? JSON.parse(readFileSync(SENT_FILE, 'utf8')) : {};
  const lines = readFileSync(PROSPECTS_FILE, 'utf8').split('\n').slice(1).filter(Boolean);

  let count = 0;
  for (const line of lines) {
    if (LIMIT && count >= LIMIT) { console.log(`\nLímite de ${LIMIT} emails alcanzado.`); break; }
    const [domain, email, url, query, category] = line.split(',').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (sent[email]) continue;
    if (SKIP_DOMAINS_SEND.has(domain)) { console.log(`  ⚠ Saltando ${domain}`); continue; }

    const { subject, body } = buildEmail({ domain, email, url, query, category });

    if (DRY) {
      console.log(`[DRY] → ${email}\nAsunto: ${subject}\n`);
    } else {
      try {
        await transporter.sendMail({ from: '"Josue · AhorroSaaS" <josue@benchdatalab.com>', to: email, subject, text: body });
        console.log(`✓ Enviado → ${email}`);
        sent[email] = new Date().toISOString();
        writeFileSync(SENT_FILE, JSON.stringify(sent, null, 2));
        count++;
        await sleep(8000 + Math.random() * 5000);
      } catch (e) {
        console.error(`✗ Error ${email}: ${e.message}`);
      }
    }
  }
  console.log(`\n✓ Emails enviados: ${count}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runTest() {
  let nodemailer;
  try { nodemailer = (await import('nodemailer')).default; } catch {
    console.error('npm install nodemailer --save-dev'); process.exit(1);
  }
  const GMAIL_USER = process.env.GMAIL_USER || 'josue@benchdatalab.com';
  const GMAIL_PASS = process.env.GMAIL_PASS;
  if (!GMAIL_PASS) { console.error('Necesitas GMAIL_PASS=...'); process.exit(1); }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  const sample = { domain: 'ejemplo.es', email: GMAIL_USER, url: 'https://ejemplo.es', query: 'herramientas seo baratas', category: 'seo' };
  const { subject, body } = buildEmail(sample);
  await transporter.sendMail({ from: '"Josue · AhorroSaaS" <josue@benchdatalab.com>', to: GMAIL_USER, subject: `[TEST] ${subject}`, text: body });
  console.log(`✓ Email de prueba enviado a ${GMAIL_USER} — revisa la bandeja de entrada`);
}

if (MODE_PROSPECT) {
  runProspect().catch(e => { console.error(e); process.exitCode = 1; });
} else if (MODE_TEST) {
  runTest().catch(e => { console.error(e.message); process.exitCode = 1; });
} else if (MODE_SEND) {
  runSend().catch(e => { console.error(e); process.exitCode = 1; });
} else {
  console.log(`Uso:
  node scripts/niche-edit.js --test                    Envía email de prueba a ti mismo
  node scripts/niche-edit.js --send [--dry]            Envía outreach (76 contactos)
  node scripts/niche-edit.js --prospect [--limit 30]   Busca más prospectos

  Requiere: GMAIL_PASS=xxxx-xxxx-xxxx-xxxx`);
}
