# AhorroSaaS — Comparador de herramientas SaaS en español

Sitio de SEO programático con 250+ páginas estáticas generadas desde JSON. Monetizado con afiliados y contenido patrocinado.

**URL producción:** https://ahorrosaas.es  
**Hosting:** Cloudflare Pages (proyecto `ahorrosaas`)  
**Deploy:** automático vía GitHub Actions en cada push a `master`

---

## Arquitectura

```
data/
  tools.json        → 35 herramientas con precio, pros, contras, score, enlace afiliado
  categories.json   → 8 categorías con keywords long-tail
  pages.json        → 11 artículos largo formato con secciones y CTAs
  site.json         → meta del sitio (baseUrl, email, etc.)

scripts/
  build.js          → genera dist/ completo (250+ páginas)
  satellites.js     → genera y despliega 5 micrositios satélite en Cloudflare Pages
  tier2.js          → pinga URLs parásitas a Wayback Machine + XML-RPC
  niche-edit.js     → outreach de link exchange (prospectar + enviar)
  sponsored-outreach.js → outreach de contenido patrocinado a SaaS

dist/               → output del build (no commitear)
  index.html
  herramientas/*.html
  categorias/*.html
  recursos/*.html
  comparativas/*.html
  alternativas/*.html
  go/*.html         → redirecciones afiliadas (noindex)
  sitemap.xml
  robots.txt

outreach/
  niche-edit-queries.txt    → 242 queries para prospectar
  prospects_clean.csv       → 69 prospectos limpios
  sent.json                 → 60 emails enviados (niche edits)
  sponsored-targets.csv     → 15 targets para patrocinios
  sponsored-sent.json       → emails de patrocinio enviados
  tier2-urls.txt            → 105 URLs para pings
  tier2-results.json        → resultados de pings
```

---

## Comandos rápidos

```bash
npm run build                    # Reconstruir dist/
npm run deploy:cloudflare        # Deploy manual a Cloudflare Pages
node scripts/satellites.js       # Actualizar 5 satélites

# Outreach niche edits
GMAIL_PASS=xxxx node scripts/niche-edit.js --send --dry    # Simular
GMAIL_PASS=xxxx node scripts/niche-edit.js --send          # Enviar
node scripts/niche-edit.js --prospect --limit 30           # Buscar más prospectos

# Outreach patrocinios
GMAIL_PASS=xxxx node scripts/sponsored-outreach.js --dry --priority 1
GMAIL_PASS=xxxx node scripts/sponsored-outreach.js --priority 1

# Tier-2
node scripts/tier2.js            # Pingar URLs pendientes (resumable)
npm run indexnow                 # Notificar a Bing/Yandex
```

---

## Añadir una herramienta nueva

1. Editar `data/tools.json` — añadir objeto al array:
```json
{
  "slug": "nombre-slug",
  "name": "Nombre Herramienta",
  "category": "seo",
  "summary": "Una línea descriptiva.",
  "price": "Desde 9€/mes",
  "bestFor": "Freelancers y pequeños negocios",
  "pros": ["Pro 1", "Pro 2", "Pro 3"],
  "cons": ["Con 1", "Con 2"],
  "score": 82,
  "affiliateUrl": "https://herramienta.com/?via=ahorrosaas",
  "affiliateStatus": "active",
  "tags": ["keyword1", "keyword2"]
}
```
2. `npm run build && npm run deploy:cloudflare`

## Añadir un artículo largo formato

1. Editar `data/pages.json` — añadir objeto al array con `slug`, `title`, `description`, `sections[]` y `ctas[]`
2. Añadir el slug al `ARTICLE_MAP` y `ARTICLE_TOOLS` en `scripts/build.js`
3. `npm run build && npm run deploy:cloudflare`

---

## Monetización

| Canal | Estado | Potencial |
|-------|--------|-----------|
| Afiliados (7 activos) | Activo | 40-100€/venta |
| Contenido patrocinado | En negociación (6 emails enviados) | 100-200€/artículo |
| Google AdSense | En revisión | Complementario |

Ver detalles en `AFILIADOS.md` y `outreach/README.md`.

---

## CI/CD

Cada push a `master` dispara `.github/workflows/pages.yml`:
1. `npm ci` → instala dependencias
2. `npm run build` → genera `dist/`
3. `wrangler pages deploy dist` → sube a Cloudflare Pages

Secrets necesarios en GitHub:
- `CLOUDFLARE_API_TOKEN` — token con permiso Pages:Edit
- `CLOUDFLARE_ACCOUNT_ID` — `cff21ad1d855910973da9d96791cc996`
