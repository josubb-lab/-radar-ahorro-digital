#!/usr/bin/env node
// Outreach de contenido patrocinado a herramientas SaaS
// Uso:
//   --dry          Simula sin enviar
//   --priority N   Solo envía prioridad N (1, 2, 3). Default: 1
//   --test         Envía email de prueba a ti mismo
//   --limit N      Máximo emails a enviar (default: 10)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TARGETS_FILE = join(ROOT, 'outreach/sponsored-targets.csv');
const SENT_FILE = join(ROOT, 'outreach/sponsored-sent.json');
const BASE_URL = 'https://ahorrosaas.es';

const DRY = process.argv.includes('--dry');
const TEST = process.argv.includes('--test');
const PRIORITY = parseInt(process.argv[process.argv.indexOf('--priority') + 1] || '1');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1]) : 10;

const GMAIL_USER = process.env.GMAIL_USER || 'josue@benchdatalab.com';
const GMAIL_PASS = process.env.GMAIL_PASS;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseCSV(text) {
  const [header, ...rows] = text.trim().split('\n');
  const keys = header.split(',');
  return rows.map(row => {
    const vals = row.split(',');
    return Object.fromEntries(keys.map((k, i) => [k, vals[i]?.trim() ?? '']));
  });
}

function buildEmail(target) {
  const subject = `Colaboración editorial — ${target.company} en AhorroSaaS.es`;
  const pageUrl = `${BASE_URL}${target.pagina_ahorrosaas}`;
  const body = `Hola equipo de ${target.company},

Gestiono AhorroSaaS.es, un comparador independiente de herramientas SaaS para pequeños negocios y autónomos en España y Latinoamérica.

Ya tenemos publicado un análisis de ${target.company} en ${pageUrl} — y estoy preparando una versión ampliada con casos de uso reales, comparativa de precios detallada y guía de primeros pasos.

¿Os interesaría patrocinar ese contenido por ${target.precio_propuesto}? Incluiría:
- Análisis en profundidad (1.500+ palabras)
- Enlace dofollow permanente
- CTA destacado en la página de categoría
- Mención en el newsletter al publicarlo

El mercado hispanohablante está poco cubierto en comparativas honestas — es una ventana de visibilidad antes de que llegue más competencia.

Si queréis ver el sitio: ahorrosaas.es

Un saludo,
Josue
josue@benchdatalab.com | ahorrosaas.es`;

  return { subject, body };
}

async function main() {
  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    console.error('npm install nodemailer --save-dev');
    process.exit(1);
  }

  if (!GMAIL_PASS && !DRY && !TEST) {
    console.error('Necesitas: GMAIL_PASS=xxxx node scripts/sponsored-outreach.js');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  if (TEST) {
    const sample = { company: 'TestCorp', pagina_ahorrosaas: '/herramientas/test/', precio_propuesto: '150€' };
    const { subject, body } = buildEmail(sample);
    await transporter.sendMail({
      from: `"Josue · AhorroSaaS" <${GMAIL_USER}>`,
      to: GMAIL_USER,
      subject: `[TEST] ${subject}`,
      text: body,
    });
    console.log(`✓ Email de prueba enviado a ${GMAIL_USER}`);
    return;
  }

  const targets = parseCSV(readFileSync(TARGETS_FILE, 'utf8'));
  const sent = existsSync(SENT_FILE) ? JSON.parse(readFileSync(SENT_FILE, 'utf8')) : {};

  const queue = targets.filter(t =>
    parseInt(t.priority) === PRIORITY &&
    t.contact_method === 'email directo' &&
    !sent[t.contact_email]
  );

  console.log(`Targets prioridad ${PRIORITY}: ${queue.length} pendientes\n`);

  let count = 0;
  for (const target of queue) {
    if (count >= LIMIT) { console.log(`\nLímite de ${LIMIT} emails alcanzado.`); break; }

    const { subject, body } = buildEmail(target);

    if (DRY) {
      console.log(`[DRY] → ${target.contact_email} (${target.company})`);
      console.log(`  Asunto: ${subject}`);
      console.log(`  Nota: ${target.notas}\n`);
    } else {
      try {
        await transporter.sendMail({
          from: `"Josue · AhorroSaaS" <${GMAIL_USER}>`,
          to: target.contact_email,
          subject,
          text: body,
        });
        console.log(`✓ Enviado → ${target.company} <${target.contact_email}>`);
        sent[target.contact_email] = { company: target.company, sent_at: new Date().toISOString() };
        writeFileSync(SENT_FILE, JSON.stringify(sent, null, 2));
        count++;
        await sleep(10000 + Math.random() * 5000);
      } catch (e) {
        console.error(`✗ Error ${target.company}: ${e.message}`);
      }
    }
  }

  console.log(`\n✓ Emails enviados: ${count}`);
  if (queue.filter(t => t.contact_method !== 'email directo').length > 0) {
    console.log(`\nTargets con formulario web (enviar manualmente):`);
    targets
      .filter(t => parseInt(t.priority) === PRIORITY && t.contact_method === 'formulario web')
      .forEach(t => console.log(`  - ${t.company}: ${BASE_URL}${t.pagina_ahorrosaas}`));
  }
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
