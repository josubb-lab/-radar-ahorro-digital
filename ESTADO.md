# AhorroSaaS — Estado del proyecto
**Última actualización:** 2026-05-20

---

## Sitio principal

| Campo | Valor |
|-------|-------|
| URL | https://ahorrosaas.es |
| Hosting | Cloudflare Pages — proyecto `ahorrosaas` |
| Deploy | Automático vía GitHub Actions (push a master) |
| Build | `npm run build` → `dist/` |

### Páginas generadas (aprox.)
| Tipo | Cantidad |
|------|----------|
| Fichas herramientas | 35 |
| Comparativas head-to-head | ~80 |
| Alternativas | 35 |
| Categorías | 8 |
| Artículos largo formato | 11 |
| Keywords | ~100 |
| Redirecciones `/go/` | 35 |
| **Total** | **~270** |

---

## Monetización

### Afiliados activos verificados
| Herramienta | Comisión | Red |
|-------------|----------|-----|
| Hostinger | ~60% primera venta | Nativo |
| systeme.io | 40% recurrente vitalicio | Nativo |
| GetResponse | 33% rec. o 100 USD CPA | PartnerStack |
| Make | 20% recurrente (año 1) | Nativo |
| LowFruits | 30% recurrente | Nativo |
| Mangools | 30% recurrente | Nativo |
| Beehiiv | 30% recurrente 12 meses | Nativo |

Ver estado completo en `AFILIADOS.md`.

### Contenido patrocinado
- **6 emails enviados** (prioridad 1): LowFruits, NeuronWriter, Pabbly, Mangools, SE Ranking, Tally
- **2 pendientes próxima ronda**: Beehiiv, AlsoAsked
- **7 más en cola**: prioridad 2-3 en `outreach/sponsored-targets.csv`
- Potencial por cierre: 100-200€/artículo

### Google AdSense
- Publisher ID: `ca-pub-4637084595771900`
- Estado: En revisión

---

## SEO / Link building

### Parasite SEO
- ~100 páginas publicadas en Telegraph, Write.as y Rentry
- Todas enlacan a páginas específicas de ahorrosaas.es

### Tier-2
- **105 URLs** procesadas (100 parásitas + 5 satélites)
- Resultados en `outreach/tier2-results.json`
- Wayback Machine: 12 guardadas | Pingomatic: 105 OK

### Sitios satélite
| Proyecto | URL | Categoría |
|----------|-----|-----------|
| herramientas-seo-baratas | herramientas-seo-baratas.pages.dev | SEO |
| email-marketing-espanol | email-marketing-espanol.pages.dev | Email marketing |
| automatizacion-no-code | automatizacion-no-code.pages.dev | Automatización |
| software-ia-contenido | software-ia-contenido.pages.dev | IA y contenido |
| crm-barato-pymes | crm-barato-pymes.pages.dev | CRM y ventas |

### Niche edit outreach
- **60 emails enviados** a webmasters reales
- **69 prospectos limpios** en `outreach/prospects_clean.csv`
- Tracking en `outreach/sent.json`

---

## Artículos publicados

| Slug | Categoría | CTAs afiliado |
|------|-----------|---------------|
| make-vs-zapier | Automatización | Make, Zapier |
| mangools-vs-semrush | SEO | Mangools |
| beehiiv-vs-mailerlite | Email | Beehiiv, MailerLite |
| lowfruits-review | SEO | LowFruits |
| mejores-herramientas-email-marketing | Email | MailerLite, GetResponse, Brevo |
| herramientas-marketing-automation-baratas | Automatización | Make, Zapier |
| mejores-herramientas-seo-baratas | SEO | Mangools, SE Ranking |
| n8n-vs-make | Automatización | Make, n8n |
| brevo-vs-mailerlite | Email | Brevo |
| mejores-herramientas-ia-contenido | IA contenido | NeuronWriter, Copy.ai |
| mejores-herramientas-funnels-baratas | Funnels | systeme.io, GetResponse |

---

## Tareas pendientes

### Urgente
- [ ] Confirmar que los 6 emails de patrocinio no rebotan (revisar bandeja de entrada)
- [ ] Verificar afiliados sin confirmar: ConvertKit, Buttondown, Tally, NeuronWriter, Copy.ai, n8n
- [ ] Aplicar a: HubSpot, ActiveCampaign, SE Ranking (afiliados de alta prioridad)

### Próxima ronda outreach patrocinios
- [ ] Beehiiv — hello@beehiiv.com (180€)
- [ ] AlsoAsked — formulario web (100€)
- [ ] Follow-up a los 6 de prioridad 1 si no responden en 5 días

### Contenido
- [ ] Artículo: "Mejores CRM baratos para pymes" (HubSpot vs Pipedrive)
- [ ] Artículo: "Hostinger vs Cloudways" (hosting — afiliados activos)
- [ ] Artículo: "Mejores VPN baratas" (NordVPN + Surfshark — afiliados pendientes)

---

## Comandos del día a día

```bash
npm run build                    # Rebuild
npm run deploy:cloudflare        # Deploy manual
node scripts/satellites.js       # Actualizar satélites
node scripts/tier2.js            # Pingar URLs nuevas

# Sponsored outreach
GMAIL_PASS=xxxx node scripts/sponsored-outreach.js --dry --priority 1
GMAIL_PASS=xxxx node scripts/sponsored-outreach.js --priority 1

# Niche edits
GMAIL_PASS=xxxx node scripts/niche-edit.js --send --dry
GMAIL_PASS=xxxx node scripts/niche-edit.js --prospect --limit 30
```
