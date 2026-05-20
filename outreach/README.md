# Outreach — AhorroSaaS

Dos estrategias activas: **niche edits** (link exchange gratuito) y **contenido patrocinado** (ingresos directos).

---

## 1. Contenido patrocinado

Ofrecer artículos en profundidad sobre una herramienta a cambio de pago. Más rápido que esperar tráfico orgánico.

### Archivos
- `sponsored-targets.csv` — 15 empresas objetivo con precio, email y página del sitio
- `sponsored-sent.json` — tracking de envíos (evita duplicados)
- `sponsored-email-template.txt` — plantilla base y variante corta

### Estado actual
| Prioridad | Empresa | Email | Precio | Estado |
|-----------|---------|-------|--------|--------|
| 1 | LowFruits | hello@lowfruits.io | 150€ | Enviado 2026-05-20 |
| 1 | NeuronWriter | contact@neuronwriter.com | 150€ | Enviado 2026-05-20 |
| 1 | Pabbly Connect | support@pabbly.com | 120€ | Enviado 2026-05-20 |
| 1 | Mangools | hello@mangools.com | 180€ | Enviado 2026-05-20 |
| 1 | SE Ranking | marketing@seranking.com | 200€ | Enviado 2026-05-20 |
| 1 | Tally | hello@tally.so | 100€ | Enviado 2026-05-20 |
| 1.5 | Beehiiv | hello@beehiiv.com | 180€ | Pendiente próxima ronda |
| 1.5 | AlsoAsked | formulario web | 100€ | Pendiente próxima ronda |
| 2 | Brevo | partnerships@brevo.com | 200€ | En cola |
| 2 | GetResponse | partnerships@getresponse.com | 200€ | En cola |
| 2 | MailerLite | partnerships@mailerlite.com | 150€ | En cola |

### Comandos
```bash
# Simular antes de enviar
GMAIL_PASS=xxxx node scripts/sponsored-outreach.js --dry --priority 1

# Enviar prioridad 1
GMAIL_PASS=xxxx node scripts/sponsored-outreach.js --priority 1

# Enviar siguiente ronda (1.5 no existe como filtro — cambiar priority a 1 en CSV)
GMAIL_PASS=xxxx node scripts/sponsored-outreach.js --priority 2

# Follow-up (5 días sin respuesta) — editar plantilla en sponsored-email-template.txt
```

### Protocolo de respuesta
- **Interesado**: enviar propuesta con detalle de la página existente + precio firme
- **Pide rebaja**: ofrecer 2 artículos por 1.5x el precio unitario
- **No responde en 5 días**: follow-up de una línea: *"¿llegó mi email del [fecha]?"*
- **Rechaza**: agradecer y preguntar si prefieren otro formato (review corta, mención, etc.)

---

## 2. Niche edits (link exchange)

Solicitar que webmasters añadan un enlace a ahorrosaas.es en artículos existentes, a cambio de reciprocidad.

### Archivos
- `niche-edit-queries.txt` — 242 queries para prospectar en Google/DuckDuckGo
- `prospects_clean.csv` — 69 prospectos con email extraído
- `sent.json` — 60 emails enviados (tracking)

### Comandos
```bash
# Buscar nuevos prospectos (requiere GOOGLE_CSE_KEY y GOOGLE_CSE_CX opcionales)
node scripts/niche-edit.js --prospect --limit 30

# Simular envío
GMAIL_PASS=xxxx node scripts/niche-edit.js --send --dry

# Enviar (con límite de seguridad)
GMAIL_PASS=xxxx node scripts/niche-edit.js --send --limit 20

# Test de email a ti mismo
GMAIL_PASS=xxxx node scripts/niche-edit.js --test
```

### Setup Google Custom Search (opcional, mejora resultados)
1. https://console.cloud.google.com → habilitar Custom Search API → crear clave
2. https://cse.google.com → crear buscador `*` (toda la web) → copiar CX
3. Usar: `GOOGLE_CSE_KEY=AIza... GOOGLE_CSE_CX=... node scripts/niche-edit.js --prospect`

---

## 3. Tier-2

Pingar URLs parásitas (Telegraph, Write.as, Rentry) a Wayback Machine y servicios XML-RPC para acelerar indexación.

### Archivos
- `tier2-urls.txt` — 105 URLs (100 parásitas + 5 satélites)
- `tier2-results.json` — resultados por URL (resumable)

### Comandos
```bash
node scripts/tier2.js    # Procesa solo las pendientes, guarda progreso
```

### Estado
- 105/105 procesadas
- Wayback Machine: 12 guardadas (rate limit en nuevas)
- Pingomatic: 105 OK

---

## Gmail App Password

Cuenta: `josue@benchdatalab.com`  
Password de aplicación: ver en Google Account → Seguridad → Contraseñas de aplicación  
(No commitear en el repo)

Para crear una nueva:
1. myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación
2. Crear para "Correo" → copiar las 16 letras sin espacios
