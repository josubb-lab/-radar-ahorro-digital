# AhorroSaaS — Afiliados
**Última actualización:** 2026-05-20

---

## ✅ Activos y verificados (7)

| Herramienta | Red | Comisión | Cookie | Notas |
|---|---|---|---|---|
| systeme.io | Nativo | 40% recurrente vitalicio | 365d | Confirmado |
| GetResponse | PartnerStack | 33% rec. o 100 USD CPA | 120d | Confirmado — elegir modelo en dashboard |
| Make | Nativo | 20% recurrente (año 1) | 90d | Confirmado |
| LowFruits | Nativo | 30% recurrente | 90d | Confirmado |
| Mangools | Nativo | 30% recurrente | 30d | Confirmado |
| Beehiiv | Nativo | 30% recurrente 12 meses | 30d | Confirmado |
| Hostinger | Referral | ~60% primera venta | 30d | Confirmado — 40-100 EUR/venta |

---

## ⚠️ Activos — tracking sin verificar (6)

Estos links están activos en el sitio pero **no se ha confirmado** que el parámetro `?via=ahorrosaas` registre clics en el dashboard del programa. Verificar uno a uno.

| Herramienta | Link actual | Riesgo | Acción |
|---|---|---|---|
| ConvertKit/Kit | `kit.com/?via=ahorrosaas` | Bajo | Entrar a kit.com/affiliates y confirmar clics |
| Buttondown | `buttondown.email/?via=ahorrosaas` | Bajo | Entrar a buttondown.email/affiliate y confirmar |
| Tally | `tally.so/?via=ahorrosaas` | Bajo | Entrar a dashboard tally.so y confirmar |
| NeuronWriter | `neuronwriter.com/?via=ahorrosaas` | Bajo | Entrar a dashboard neuronwriter.com y confirmar |
| Copy.ai | `copy.ai/?via=ahorrosaas` | **Medio** | Programa es PartnerStack — puede necesitar link diferente |
| n8n | `n8n.io/?via=ahorrosaas` | **Alto** | Programa es PartnerStack — link probable que NO trackee |

### Pasos para verificar cada uno

1. Entrar al dashboard del afiliado (links arriba)
2. Comprobar si hay clics registrados en los últimos días
3. Si hay clics → confirmar, marcar como verificado en tools.json (`affiliateNetwork` = nombre del programa)
4. Si no hay clics → ir a `affiliateSignupUrl`, obtener link correcto, actualizar `affiliateUrl` en tools.json
5. Ejecutar `npm run build && npm run deploy:cloudflare`

**Especial n8n:** aplicar en `https://n8n.io/affiliate/` (PartnerStack) para obtener link correcto.
**Especial Copy.ai:** aplicar en `https://www.copy.ai/partners` para obtener link PartnerStack.

---

## 🚀 Apply now — prioridad alta (3)

Estos tres tienen programas abiertos, buenas comisiones y contenido ya publicado en el sitio. Aplicar esta semana.

| Herramienta | Red | Comisión | Cookie | URL aplicación |
|---|---|---|---|---|
| **HubSpot** | Impact.com | 30% rec. (hasta 1.000 USD/mes) | 90d | https://www.hubspot.com/partners/affiliate-program |
| **ActiveCampaign** | Impact.com | 20-30% recurrente | 90d | https://www.activecampaign.com/partner/ |
| **SE Ranking** | PartnerStack | 30% recurrente | 120d | https://seranking.com/referral-program.html |

**Flujo tras aprobación:**
1. Copiar enlace afiliado del dashboard
2. Editar `data/tools.json` → `affiliateUrl` + `affiliateStatus: "active"`
3. `npm run build && npm run deploy:cloudflare`

---

## ⏳ Aplicados — esperando respuesta (2)

| Herramienta | Red | Email | Comisión esperada | Acción |
|---|---|---|---|---|
| Brevo | Nativo Brevo | hola@ahorrosaas.es | 5 EUR lead + 100 EUR upgrade | Esperar — seguimiento si no hay respuesta en 2 semanas |
| NordVPN | Impact.com | hola@ahorrosaas.es | 40% primera + 30% renovación | Esperar — contactar Impact si tarda más de 7 días |

---

## ❌ Rechazado (1)

| Herramienta | Red | Motivo | Cuándo reintentar |
|---|---|---|---|
| SEMrush | Impact.com | Tráfico insuficiente | Cuando ahorrosaas.es supere 500 visitas/mes orgánicas |

---

## 📋 Cola de aplicaciones — prioridad media/baja

Ordenadas por potencial económico. No aplicar hasta tener los 3 de "apply now" activos.

| Herramienta | Red | Comisión | URL |
|---|---|---|---|
| Zapier | Impact.com | 25% recurrente | https://zapier.com/affiliate |
| Pipedrive | PartnerStack | 33% recurrente | https://www.pipedrive.com/en/partners/affiliate |
| Cloudways | Directo | 30 USD + 7% rec. | https://www.cloudways.com/en/affiliates.php |
| Webflow | Directo | 50% primer año | https://webflow.com/affiliates |
| Canva | Impact.com | por definir | https://www.canva.com/affiliates/ |
| Surfshark | Impact.com | 40% + 30% renovación | https://surfshark.com/affiliates |
| Pabbly Connect | Directo | 30% venta única | https://www.pabbly.com/affiliate/ |
| Ubersuggest | Directo | por definir | https://neilpatel.com/affiliates/ |

---

## ❌ Sin programa (definitivo)

| Herramienta | Motivo |
|---|---|
| MailerLite | Programa cerrado — revisar cada 3 meses |
| ChatGPT / OpenAI | Sin programa afiliado público |
| Notion | Solo créditos internos, sin cash |
| Ahrefs | Sin programa de afiliados |
| Screaming Frog | Sin programa de afiliados |
| AlsoAsked | Sin programa conocido |

---

## Comandos útiles

```bash
# Tras actualizar affiliateUrl en tools.json:
npm run build && npm run deploy:cloudflare

# Ver qué herramientas tienen affiliateUrl de ejemplo (pendientes reales):
node -e "const d=require('./data/tools.json'); d.filter(t=>t.affiliateUrl.includes('example.com')).forEach(t=>console.log(t.name, '-', t.affiliateStatus))"
```
