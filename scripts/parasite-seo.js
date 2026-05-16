#!/usr/bin/env node
// Parasite SEO: auto-publish to Telegraph, Write.as and Rentry with backlinks to ahorrosaas.es
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const tools = JSON.parse(readFileSync(join(ROOT, 'data/tools.json'), 'utf8'));
const categories = JSON.parse(readFileSync(join(ROOT, 'data/categories.json'), 'utf8'));
const site = JSON.parse(readFileSync(join(ROOT, 'data/site.json'), 'utf8'));

const BASE = site.baseUrl;
const RESULTS = join(ROOT, 'data/parasite-urls.json');
const DRY = process.argv.includes('--dry');

let published = existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, 'utf8')) : [];

// ── Content generators ───────────────────────────────────────────────

function slugToName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function toolArticle(tool) {
  const cat = categories.find(c => c.slug === tool.category);
  const catName = cat?.name ?? tool.category;
  const name = tool.name ?? slugToName(tool.slug);
  const rivals = tools
    .filter(t => t.category === tool.category && t.slug !== tool.slug)
    .slice(0, 4)
    .map(t => t.name ?? slugToName(t.slug));
  const rivalLines = rivals.length
    ? rivals.map(r => `- **${r}**: [ver comparativa →](${BASE}/comparativas/${tool.slug}-vs-${r.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}/)`).join('\n')
    : `[Ver todas las alternativas →](${BASE})`;

  const title = `${name}: alternativas baratas y comparativa honesta 2026`;
  const body = `# ${name}: ¿vale la pena o hay algo mejor?

Si estás evaluando **${name}** para tu negocio, esta guía te ahorra horas de búsqueda.

## ¿Qué hace ${name}?

${tool.summary ?? `${name} es una herramienta de ${catName.toLowerCase()} pensada para ${tool.bestFor ?? 'equipos pequeños y autónomos'}.`}

**Ideal para:** ${tool.bestFor ?? catName.toLowerCase()}

## Lo bueno y lo no tan bueno

${tool.pros?.map(p => `✓ ${p}`).join('\n') ?? ''}
${tool.cons?.map(c => `✗ ${c}`).join('\n') ?? ''}

## Alternativas a ${name} que cuestan menos

${rivalLines}

Comparativa completa con precios actualizados: [ahorrosaas.es/herramientas/${tool.slug}/](${BASE}/herramientas/${tool.slug}/)

## ¿Cuánto cuesta ${name}?

**${tool.price ?? 'Ver precio actualizado'}** — pero antes de pagar, revisa si las alternativas cubren tu caso de uso.

👉 [Comparativa de precios actualizada → AhorroSaaS](${BASE}/herramientas/${tool.slug}/)

---
*Fuente: [AhorroSaaS.es](${BASE}) — comparamos más de 30 herramientas SaaS para pequeños negocios sin letra pequeña.*`;

  return { title, body };
}

function categoryArticle(cat) {
  const catTools = tools.filter(t => t.category === cat.slug).slice(0, 6);
  const toolLines = catTools.map((t, i) => {
    const name = t.name ?? slugToName(t.slug);
    return `${i + 1}. **[${name}](${BASE}/herramientas/${t.slug}/)** — ${t.summary?.split(';')[0] ?? name}`;
  }).join('\n');

  const keywords = cat.keywords?.join(', ') ?? cat.name;
  const title = `Mejores herramientas de ${cat.name} para pequeños negocios en 2026`;
  const body = `# Las mejores herramientas de ${cat.name} en 2026

Elegir bien el software de ${cat.name.toLowerCase()} puede significar ahorrar cientos de euros al año. Esta guía está escrita para **${cat.audience ?? 'pequeños negocios y autónomos'}** que quieren ${cat.intent ?? 'sacar más partido sin gastar más'}.

*Palabras clave: ${keywords}*

## Comparativa rápida

${toolLines}

## ¿Por qué importa elegir bien?

La mayoría de comparativas están escritas para empresas con presupuesto ilimitado. En [AhorroSaaS](${BASE}) analizamos el coste-beneficio real para negocios que no pueden permitirse pagar por funciones que no usan.

## Ver la comparativa completa

👉 **[Todas las herramientas de ${cat.name} con precios → AhorroSaaS.es](${BASE})**

Filtramos por precio, funciones y casos de uso para que no tengas que hacer el trabajo tú.

---
*[AhorroSaaS.es](${BASE}) — software asequible para pequeños negocios. Actualizado mayo 2026.*`;

  return { title, body };
}

// ── Markdown → Telegraph nodes ───────────────────────────────────────

function parseInline(text) {
  const parts = [];
  const rx = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[0].startsWith('**')) {
      parts.push({ tag: 'b', children: [m[2]] });
    } else {
      parts.push({ tag: 'a', attrs: { href: m[4] }, children: [m[3]] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.filter(Boolean);
}

function mdToTelegraph(md) {
  const nodes = [];
  let listBuf = [];

  function flushList() {
    if (!listBuf.length) return;
    nodes.push({ tag: 'ul', children: listBuf.map(l => ({ tag: 'li', children: parseInline(l) })) });
    listBuf = [];
  }

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }

    if (line.startsWith('# ')) { flushList(); nodes.push({ tag: 'h3', children: [line.slice(2)] }); continue; }
    if (line.startsWith('## ')) { flushList(); nodes.push({ tag: 'h4', children: [line.slice(3)] }); continue; }
    if (line.startsWith('### ')) { flushList(); nodes.push({ tag: 'h4', children: [line.slice(4)] }); continue; }
    if (/^[-*] /.test(line)) { listBuf.push(line.slice(2)); continue; }
    if (/^\d+\.\s/.test(line)) { listBuf.push(line.replace(/^\d+\.\s/, '')); continue; }

    flushList();
    nodes.push({ tag: 'p', children: parseInline(line) });
  }
  flushList();
  return nodes;
}

// ── Platform publishers ───────────────────────────────────────────────

async function postTelegraph(title, body) {
  const acc = await fetch(
    `https://api.telegra.ph/createAccount?short_name=AhorroSaaS&author_name=AhorroSaaS&author_url=${encodeURIComponent(BASE)}`
  ).then(r => r.json());
  if (!acc.ok) throw new Error(`Telegraph account: ${acc.error}`);

  const content = mdToTelegraph(body);
  const page = await fetch('https://api.telegra.ph/createPage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: acc.result.access_token, title, content, return_content: false }),
  }).then(r => r.json());
  if (!page.ok) throw new Error(`Telegraph page: ${page.error}`);
  return page.result.url;
}

async function postWriteAs(title, body) {
  const res = await fetch('https://write.as/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: `# ${title}\n\n${body}`, title, font: 'serif', lang: 'es' }),
  }).then(r => r.json());
  if (!res.data?.id) throw new Error(`Write.as: ${JSON.stringify(res)}`);
  return `https://write.as/${res.data.id}`;
}

async function postRentry(title, body) {
  // Get CSRF token
  const home = await fetch('https://rentry.co', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const cookie = home.headers.get('set-cookie') ?? '';
  const csrf = cookie.match(/csrftoken=([^;]+)/)?.[1];
  if (!csrf) throw new Error('Rentry: no CSRF token');

  const form = new URLSearchParams({
    csrfmiddlewaretoken: csrf,
    text: `# ${title}\n\n${body}`,
  });
  const res = await fetch('https://rentry.co/api/new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `csrftoken=${csrf}`,
      'Referer': 'https://rentry.co',
      'User-Agent': 'Mozilla/5.0',
    },
    body: form.toString(),
  }).then(r => r.json());
  if (res.status !== '200') throw new Error(`Rentry: ${JSON.stringify(res)}`);
  return res.url;
}

// ── Orchestrator ─────────────────────────────────────────────────────

const delay = ms => new Promise(r => setTimeout(r, ms));

async function publish(key, title, body) {
  if (published.find(p => p.key === key)) {
    console.log(`  SKIP ${key}`);
    return;
  }

  console.log(`  Publishing: ${title.slice(0, 60)}`);

  if (DRY) {
    console.log(`  [DRY] would post to Telegraph, Write.as, Rentry`);
    published.push({ key, title, urls: { dry: true }, publishedAt: new Date().toISOString() });
    return;
  }

  const entry = { key, title, urls: {}, publishedAt: new Date().toISOString() };

  for (const [name, fn] of [['telegraph', postTelegraph], ['writeas', postWriteAs], ['rentry', postRentry]]) {
    await delay(1200);
    try {
      entry.urls[name] = await fn(title, body);
      console.log(`    ${name}: ${entry.urls[name]}`);
    } catch (e) {
      console.error(`    ${name} FAIL: ${e.message}`);
    }
  }

  published.push(entry);
  writeFileSync(RESULTS, JSON.stringify(published, null, 2));
}

async function main() {
  console.log(`Parasite SEO publisher — ${DRY ? 'DRY RUN' : 'LIVE'}\n`);

  for (const tool of tools) {
    console.log(`\nTool: ${tool.slug}`);
    const { title, body } = toolArticle(tool);
    await publish(`tool:${tool.slug}`, title, body);
    await delay(2000);
  }

  for (const cat of categories) {
    console.log(`\nCategory: ${cat.slug}`);
    const { title, body } = categoryArticle(cat);
    await publish(`cat:${cat.slug}`, title, body);
    await delay(2000);
  }

  const total = published.filter(p => !p.urls.dry).length;
  console.log(`\nDone. ${total} artículos publicados → data/parasite-urls.json`);
}

main().catch(console.error);
