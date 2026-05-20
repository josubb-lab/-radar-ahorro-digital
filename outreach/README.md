# Outreach — setup

## Niche edit prospector

Necesita Google Custom Search API (gratis, 100 búsquedas/día).

### 1. Activar la API

1. Ve a https://console.cloud.google.com
2. Crea un proyecto o usa uno existente
3. Busca "Custom Search API" → Habilitar
4. Ve a Credenciales → Crear credencial → Clave de API
5. Copia la clave → es tu `GOOGLE_CSE_KEY`

### 2. Crear el buscador

1. Ve a https://cse.google.com
2. Crear buscador → en "Sitios a buscar" pon `*` (toda la web)
3. Copiar el ID del buscador → es tu `GOOGLE_CSE_CX`

### 3. Ejecutar

```bash
GOOGLE_CSE_KEY=AIza... GOOGLE_CSE_CX=a1b2c3... node scripts/niche-edit.js --prospect --limit 100
```

O añade al .env (no commitear):
```
GOOGLE_CSE_KEY=AIza...
GOOGLE_CSE_CX=a1b2c3...
```

Luego:
```bash
node scripts/niche-edit.js --prospect           # encuentra prospectos → outreach/prospects.csv
node scripts/niche-edit.js --prospect --limit 50  # solo 50 queries (50 de 100 cuota diaria)
```

## Envío de emails (link exchange)

Necesita App Password de Gmail:
1. Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación
2. Crear una para "Mail" → copiar las 16 letras

```bash
GMAIL_USER=josubb@gmail.com GMAIL_PASS=xxxx-xxxx-xxxx-xxxx node scripts/niche-edit.js --send --dry
# quita --dry para enviar de verdad
```

## Tier-2

```bash
node scripts/tier2.js   # pinga las 100 URLs parásitas (resumable)
```

## Archivos generados

- `prospects.csv` — prospectos con email, dominio, query y categoría
- `sent.json` — emails ya enviados (evita duplicados)
- `tier2-results.json` — resultados de pings
