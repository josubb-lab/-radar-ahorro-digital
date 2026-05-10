# Publicar coste 0

## Opcion A: GitHub Pages

1. Crea un repositorio vacio en GitHub.
2. Conecta este repo local:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin master
```

3. En GitHub, ve a `Settings > Pages`.
4. En `Build and deployment`, elige `GitHub Actions`.
5. El workflow `.github/workflows/pages.yml` generara `dist/` y lo publicara.

## Opcion B: Cloudflare Pages

1. Sube el repo a GitHub.
2. En Cloudflare Pages, conecta el repo.
3. Configura:

```text
Build command: npm run build
Build output directory: dist
```

## Antes de publicar

Edita `data/site.json`:

```json
{
  "baseUrl": "https://tudominio.com",
  "email": "tu@email.com"
}
```

Edita `data/tools.json` y sustituye `https://example.com/go/...` por enlaces afiliados reales.

Despues ejecuta:

```bash
npm run build
git add .
git commit -m "Configure production site"
git push
```
