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
4. En `Custom domains`, anade:

```text
ahorrosaas.es
www.ahorrosaas.es
```

5. En DNS, si Cloudflare gestiona el dominio, deja que Pages cree los registros. Si el dominio esta en otro registrador, apunta los nameservers a Cloudflare.

## Antes de publicar

Edita `data/site.json`:

```json
{
  "baseUrl": "https://ahorrosaas.es",
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
