# AhorroSaaS — Estado del proyecto
**Última actualización:** 2026-05-17

---

## Sitio principal

- **URL:** https://ahorrosaas.es
- **Hosting:** Cloudflare Pages (proyecto: `ahorrosaas`)
- **Build:** `npm run build` → genera `dist/` con 235 páginas estáticas
- **Deploy:** `npm run deploy:cloudflare`

### Páginas generadas
| Tipo | Cantidad |
|---|---|
| Fichas herramientas | 33 |
| Comparativas head-to-head | ~80 |
| Alternativas | 33 |
| Categorías | 8 |
| Artículos largo formato | 7 |
| Keywords | varias |
| Redirecciones `/go/` | 33 |

---

## Monetización activa

### Google AdSense
- **Publisher ID:** `ca-pub-4637084595771900`
- **Modo:** Anuncios automáticos
- **Estado:** En revisión (1-7 días)
- Script en todas las páginas del layout principal

### Afiliados — ver `AFILIADOS.md`

---

## SEO / Link building

### Parasite SEO
- **50 páginas** publicadas en Telegraph, Write.as y Rentry
- URLs registradas en `data/parasite-urls.json`
- Script: `npm run parasite`

### Tier-2
- **100 URLs parásitas** pineadas a Pingomatic + Wayback Machine
- Resultados en `outreach/tier2-results.json`
- Script: `npm run tier2`

### Sitios satélite (Cloudflare Pages)
| Proyecto | URL | Categoría |
|---|---|---|
| herramientas-seo-baratas | herramientas-seo-baratas.pages.dev | SEO |
| email-marketing-espanol | email-marketing-espanol.pages.dev | Email marketing |
| automatizacion-no-code | automatizacion-no-code.pages.dev | Automatización |
| software-ia-contenido | software-ia-contenido.pages.dev | IA y contenido |
| crm-barato-pymes | crm-barato-pymes.pages.dev | CRM y ventas |

Todos enlazan a ahorrosaas.es con contenido real por categoría.

### Niche edit outreach
- Queries en `outreach/niche-edit-queries.txt` (242 queries)
- Script: `node scripts/niche-edit.js --prospect` (requiere `GOOGLE_CSE_KEY` y `GOOGLE_CSE_CX`)
- Ver instrucciones en `outreach/README.md`

---

## IndexNow
- Clave: `e6508fe838ed4faa36f6c80dbd93bda6`
- Script: `npm run indexnow`

---

## Comandos rápidos
```bash
npm run build              # Reconstruir sitio
npm run deploy:cloudflare  # Desplegar a producción
npm run parasite           # Publicar en plataformas parásitas
npm run tier2              # Ping tier-2 a URLs parásitas
npm run indexnow           # Notificar a Bing/Yandex URLs nuevas
node scripts/satellites.js # Regenerar y desplegar satélites
```
