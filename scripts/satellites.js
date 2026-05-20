#!/usr/bin/env node
// Genera y despliega sitios satélite en Cloudflare Pages
// Uso: node scripts/satellites.js
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TMP = '/tmp/ahorrosaas-satellites';

const tools    = JSON.parse(await import('fs').then(f => f.promises.readFile(join(ROOT, 'data/tools.json'), 'utf8')));
const cats     = JSON.parse(await import('fs').then(f => f.promises.readFile(join(ROOT, 'data/categories.json'), 'utf8')));
const BASE     = 'https://ahorrosaas.es';

const SITES = [
  {
    name: 'herramientas-seo-baratas',
    category: 'seo',
    title: 'Herramientas SEO baratas para pequeños negocios 2026',
    description: 'Comparativa de herramientas SEO asequibles: Mangools, LowFruits, SE Ranking y alternativas a Semrush y Ahrefs sin pagar de más.',
  },
  {
    name: 'email-marketing-espanol',
    category: 'email-marketing',
    title: 'Email marketing en español: guía para autónomos y pymes',
    description: 'Las mejores herramientas de email marketing en español con planes gratuitos y precios honestos para pequeños negocios.',
  },
  {
    name: 'automatizacion-no-code',
    category: 'automatizacion',
    title: 'Automatización no-code para pequeños negocios en 2026',
    description: 'Make, Zapier y n8n comparados para autónomos y pymes: cuál usar, cuánto cuesta y cómo empezar sin saber programar.',
  },
  {
    name: 'software-ia-contenido',
    category: 'ia-contenido',
    title: 'Software de IA para crear contenido en español',
    description: 'ChatGPT, Notion y NeuronWriter comparados para marketers y redactores: qué hace cada uno y cuánto cuesta realmente.',
  },
  {
    name: 'crm-barato-pymes',
    category: 'crm-ventas',
    title: 'CRM barato para pymes y autónomos en España',
    description: 'HubSpot vs Pipedrive y alternativas gratuitas para equipos pequeños: cuál elegir según tu volumen de ventas.',
  },
];

function html(site, cat, catTools) {
  const top = catTools.slice(0, 4);
  const rows = top.map((t, i) => `
    <div class="card">
      <span class="num">${i + 1}</span>
      <div>
        <h3><a href="${BASE}/herramientas/${t.slug}/" target="_blank" rel="noopener">${t.name}</a></h3>
        <p>${t.summary}</p>
        <p class="meta"><strong>Precio:</strong> ${t.price} · <strong>Mejor para:</strong> ${t.bestFor}</p>
      </div>
    </div>`).join('');

  const pros = top.map(t =>
    `<li><strong>${t.name}</strong>: ${t.pros[0]}</li>`).join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${site.title}</title>
  <meta name="description" content="${site.description}">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;color:#1a202c;line-height:1.7;max-width:780px;margin:0 auto;padding:24px 16px}
    h1{font-size:1.9rem;margin-bottom:.5rem;color:#0f1729}
    h2{font-size:1.3rem;margin:2rem 0 1rem;color:#0d6b62}
    h3{font-size:1.1rem;color:#0f1729}
    p{margin-bottom:1rem;color:#374151}
    .card{display:flex;gap:16px;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px}
    .num{font-size:1.5rem;font-weight:800;color:#0d6b62;min-width:32px}
    .meta{font-size:.9rem;color:#6b7280}
    ul{padding-left:1.2rem;margin-bottom:1rem}
    li{margin-bottom:.4rem}
    a{color:#0d6b62}
    .cta{background:#0d6b62;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:8px 0;font-weight:600}
    footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:.85rem;color:#9ca3af}
  </style>
</head>
<body>
  <h1>${site.title}</h1>
  <p>${site.description}</p>
  <p>Comparativa actualizada mayo 2026 por <a href="${BASE}" target="_blank" rel="noopener">AhorroSaaS.es</a>, comparador independiente de software para pequeños negocios.</p>

  <h2>Las ${top.length} mejores opciones en ${cat.name}</h2>
  ${rows}

  <h2>Qué mirar antes de pagar</h2>
  <p>En ${cat.name.toLowerCase()} el precio inicial es solo el primer filtro. También importa:</p>
  <ul>
    <li>Límites del plan gratuito o de prueba</li>
    <li>Coste al escalar (más usuarios, más envíos, más proyectos)</li>
    <li>Facilidad para exportar datos si cambias</li>
    <li>Soporte real en español o con documentación clara</li>
  </ul>

  <h2>Ventaja principal de cada opción</h2>
  <ul>${pros}</ul>

  <h2>Comparativa completa</h2>
  <p>En AhorroSaaS comparamos más de 30 herramientas con criterios editoriales: coste inicial, encaje para equipos pequeños y riesgo de dependencia del proveedor.</p>
  <a class="cta" href="${BASE}/categorias/${cat.slug}/" target="_blank" rel="noopener">Ver comparativa completa →</a>

  <footer>
    Contenido editorial independiente · <a href="${BASE}" target="_blank" rel="noopener">AhorroSaaS.es</a> · Algunos enlaces pueden ser de afiliado.
  </footer>
</body>
</html>`;
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

for (const site of SITES) {
  const cat = cats.find(c => c.slug === site.category);
  const catTools = tools.filter(t => t.category === site.category).sort((a,b) => b.score - a.score);
  const dir = join(TMP, site.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html(site, cat, catTools));
  writeFileSync(join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\n');

  console.log(`Generado: ${site.name}`);

  try {
    // Crear el proyecto si no existe
    try {
      execSync(`npx wrangler pages project create ${site.name} --production-branch main`, { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    } catch { /* ya existe, continuar */ }

    const out = execSync(
      `npx wrangler pages deploy ${dir} --project-name ${site.name} --branch main --commit-dirty=true`,
      { cwd: ROOT, encoding: 'utf8', timeout: 60000 }
    );
    const url = out.match(/https:\/\/[^\s]+pages\.dev/)?.[0] ?? '(ver consola)';
    console.log(`  ✓ Desplegado → ${url}`);
  } catch(e) {
    console.error(`  ✗ Error deploy ${site.name}:`, e.message.slice(0, 120));
  }
}

console.log('\nHecho. Revisa tus proyectos en https://dash.cloudflare.com → Pages');
