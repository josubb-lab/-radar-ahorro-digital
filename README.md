# Radar Ahorro Digital

Motor programatico de afiliacion para generar paginas estaticas desde datos JSON.

## Comandos

```bash
npm run build
npm run scrape
npm run pipeline
```

La web publicable queda en `dist/`.

## Flujo de monetizacion

1. Edita `data/tools.json` con herramientas, pros, contras, score y enlace afiliado.
2. Edita `data/categories.json` con nichos y keywords long-tail.
3. Ejecuta `npm run build`.
4. Publica `dist/` en Cloudflare Pages, GitHub Pages o Netlify.
5. Mide clicks por rutas `/go/<herramienta>.html`.

## Scraping responsable

1. Edita `data/sources.json`.
2. Activa solo fuentes publicas permitidas con `"enabled": true`.
3. Ejecuta `npm run scrape`.
4. El scraper guarda resultados en `data/offers.scraped.json`.
5. Ejecuta `npm run build` o directamente `npm run pipeline`.

El scraper incluido soporta RSS publico, consulta `robots.txt`, usa `User-Agent`, tiene timeout y pausa entre fuentes. No esta pensado para evadir bloqueos ni para extraer fuentes con login, paywall o restricciones antibot.

## Paginas generadas

- Home con ranking y ofertas.
- Categorias: `dist/categorias/*.html`.
- Alternativas: `dist/alternativas/*.html`.
- Comparativas: `dist/comparativas/*.html`.
- Redirecciones afiliadas: `dist/go/*.html`.
- `sitemap.xml` y `robots.txt`.

## Coste cero

- Node.js local para generar.
- Hosting estatico gratuito.
- Sin backend obligatorio.
- Sin base de datos.

## Lineas rojas

- No copiar contenido de terceros.
- No publicar reviews falsas.
- No hacer cloaking ni redirecciones enganiosas.
- No evadir bloqueos, logins, paywalls ni medidas antibot.
- Marcar enlaces afiliados con `rel="sponsored"` y aviso visible.
