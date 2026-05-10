# Cloudflare Pages para AhorroSaaS

## Configuracion

```text
Project name: ahorrosaas
Framework preset: None
Build command: npm run build
Build output directory: dist
Node version: 24
```

El primer deploy manual ya esta hecho con Wrangler:

```text
https://ahorrosaas.pages.dev
```

Para redeploy local:

```bash
npm run deploy:cloudflare
```

## Dominio

Dominio principal:

```text
ahorrosaas.es
```

Alias recomendado:

```text
www.ahorrosaas.es
```

## Produccion SEO

Despues de conectar el dominio:

1. Verifica que `https://ahorrosaas.es/sitemap.xml` carga.
2. Envia `https://ahorrosaas.es/sitemap.xml` en Google Search Console.
3. Activa Cloudflare Web Analytics.
4. Sustituye placeholders de afiliado en `data/tools.json`.
5. Cambia `email` en `data/site.json`.

## Nota

Las rutas `/go/*` quedan fuera del sitemap y tienen `X-Robots-Tag: noindex, nofollow` en `dist/_headers`.
