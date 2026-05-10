import { mkdir, readFile, rm, writeFile, copyFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const dataDir = path.join(root, "data");

const site = {
  name: "Radar Ahorro Digital",
  description: "Comparativas programaticas de herramientas baratas para automatizar, captar leads y monetizar con bajo coste.",
  baseUrl: "",
  email: "tucorreo@example.com"
};

const readJson = async (file) => JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
const readOptionalJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
  } catch {
    return fallback;
  }
};
const slugify = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const moneyPath = (slug) => `go/${slug}.html`;
const categoryPath = (slug) => `categorias/${slug}.html`;
const alternativePath = (slug) => `alternativas/alternativas-a-${slug}.html`;
const comparisonPath = (a, b) => `comparativas/${a}-vs-${b}.html`;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function layout({ title, description, body, canonical = "", relative = "." }) {
  const assetPrefix = relative === "." ? "" : `${relative}/`;
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${esc(canonical)}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:type" content="website">
    <link rel="icon" href="${assetPrefix}assets/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="${assetPrefix}styles.css">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="${assetPrefix}index.html" aria-label="${esc(site.name)}">
        <span class="brand-mark">R</span>
        <span>${esc(site.name)}</span>
      </a>
      <nav class="nav" aria-label="Principal">
        <a href="${assetPrefix}index.html#comparador">Comparador</a>
        <a href="${assetPrefix}index.html#categorias">Categorias</a>
        <a href="${assetPrefix}index.html#ofertas">Ofertas</a>
      </nav>
    </header>
    ${body}
    <footer class="footer">
      <span>© 2026 ${esc(site.name)}</span>
      <a href="${assetPrefix}privacidad.html">Privacidad</a>
      <a href="${assetPrefix}aviso-afiliados.html">Afiliados</a>
      <a href="${assetPrefix}sitemap.xml">Sitemap</a>
    </footer>
  </body>
</html>`;
}

function toolCard(tool, categories, relative = ".") {
  const category = categories.find((item) => item.slug === tool.category);
  const assetPrefix = relative === "." ? "" : `${relative}/`;
  return `<article class="tool-card${tool.featured ? " featured" : ""}" data-category="${esc(tool.category)}">
    <div class="tool-top">
      <span class="tag">${esc(category?.name ?? tool.category)}</span>
      <span class="price">${esc(tool.price)}</span>
    </div>
    <h3>${esc(tool.name)}</h3>
    <p>${esc(tool.summary)}</p>
    <ul>${tool.pros.slice(0, 3).map((pro) => `<li>${esc(pro)}</li>`).join("")}</ul>
    <div class="score" aria-label="Puntuacion editorial">${esc(tool.score)}/10</div>
    <a class="card-link" href="${assetPrefix}${moneyPath(tool.slug)}" rel="sponsored">Ver oferta</a>
  </article>`;
}

function homePage(tools, categories, offers) {
  const featured = [...tools].sort((a, b) => b.score - a.score).slice(0, 6);
  const body = `<main id="top">
    <section class="hero">
      <img class="hero-bg" src="assets/hero.svg" alt="" aria-hidden="true">
      <div class="hero-content">
        <p class="eyebrow">Sistema programatico de monetizacion</p>
        <h1>${esc(site.name)}</h1>
        <p class="hero-copy">Paginas long-tail generadas desde datos propios para captar busquedas comerciales, enviar clicks afiliados y medir que categorias convierten.</p>
        <div class="hero-actions">
          <a class="button primary" href="#comparador">Ver herramientas</a>
          <a class="button secondary" href="#categorias">Explorar nichos</a>
        </div>
      </div>
    </section>
    <section class="trust-strip" aria-label="Avisos importantes">
      <span>Contenido programatico revisable</span>
      <span>Enlaces afiliados marcados</span>
      <span>Coste de hosting casi cero</span>
    </section>
    <section id="comparador" class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Ranking</p>
          <h2>Herramientas con mejor retorno potencial</h2>
        </div>
      </div>
      <div class="tool-grid">${featured.map((tool) => toolCard(tool, categories)).join("")}</div>
    </section>
    <section id="categorias" class="section band">
      <div class="section-head">
        <div>
          <p class="eyebrow">Paginas generadas</p>
          <h2>Categorias monetizables</h2>
        </div>
      </div>
      <div class="programmatic-grid">
        ${categories.map((category) => `<a class="program-card" href="${categoryPath(category.slug)}">
          <span>${esc(category.name)}</span>
          <strong>Mejores herramientas de ${esc(category.name.toLowerCase())}</strong>
          <p>${esc(category.intent)} para ${esc(category.audience)}.</p>
        </a>`).join("")}
      </div>
    </section>
    <section id="ofertas" class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Ofertas y angulos</p>
          <h2>Promociones para empujar clicks</h2>
        </div>
      </div>
      <div class="offer-list">
        ${offers.map((offer) => {
          const tool = tools.find((item) => item.slug === offer.tool);
          return `<a href="${moneyPath(tool.slug)}">
            <span>${esc(tool.name)}</span>
            <strong>${esc(offer.label)}</strong>
            <small>${esc(offer.urgency)}</small>
          </a>`;
        }).join("")}
      </div>
    </section>
    <section id="newsletter" class="section cta">
      <div>
        <p class="eyebrow">Captacion propia</p>
        <h2>Lista de ofertas y herramientas baratas</h2>
        <p>Conecta este formulario con Brevo, MailerLite o cualquier endpoint gratuito cuando empieces a recibir trafico.</p>
      </div>
      <form class="signup" action="mailto:${esc(site.email)}" method="post" enctype="text/plain">
        <label for="email">Email</label>
        <div class="input-row">
          <input id="email" name="email" type="email" placeholder="tu@email.com" required>
          <button class="button primary" type="submit">Apuntarme</button>
        </div>
        <small>Sin spam. Puedes darte de baja cuando quieras.</small>
      </form>
    </section>
  </main>
  <script src="script.js"></script>`;
  return layout({ title: `${site.name} | Herramientas baratas para monetizar`, description: site.description, body });
}

function categoryPage(category, tools, categories) {
  const matching = tools.filter((tool) => tool.category === category.slug).sort((a, b) => b.score - a.score);
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Categoria</p>
      <h1>Mejores herramientas de ${esc(category.name.toLowerCase())} para ${esc(category.audience)}</h1>
      <p>${esc(category.intent)}. Seleccion basada en coste inicial, facilidad de implantacion y potencial de retorno.</p>
    </section>
    <section class="section">
      <div class="tool-grid">${matching.map((tool) => toolCard(tool, categories, "..")).join("")}</div>
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Keywords objetivo</p>
        <h2>Angulos long-tail</h2>
      </div>
      <ul class="keyword-list">${category.keywords.map((keyword) => `<li>${esc(keyword)}</li>`).join("")}</ul>
    </section>
  </main>`;
  return layout({
    title: `Mejores herramientas de ${category.name.toLowerCase()} baratas`,
    description: `Ranking de herramientas de ${category.name.toLowerCase()} para ${category.audience}.`,
    body,
    relative: ".."
  });
}

function alternativePage(tool, category, competitors) {
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Alternativas</p>
      <h1>Alternativas a ${esc(tool.name)} baratas y faciles de probar</h1>
      <p>${esc(tool.summary)} Si no encaja por precio o flujo, estas opciones cubren casos parecidos.</p>
    </section>
    <section class="section">
      <div class="comparison-table">
        <table>
          <thead><tr><th>Herramienta</th><th>Ideal para</th><th>Precio</th><th>Score</th><th></th></tr></thead>
          <tbody>
            ${[tool, ...competitors].map((item) => `<tr>
              <td><strong>${esc(item.name)}</strong></td>
              <td>${esc(item.bestFor)}</td>
              <td>${esc(item.price)}</td>
              <td>${esc(item.score)}/10</td>
              <td><a href="../${moneyPath(item.slug)}" rel="sponsored">Ver</a></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="section">
      <p class="eyebrow">Categoria relacionada</p>
      <h2>${esc(category.name)}</h2>
      <p>${esc(category.intent)}.</p>
      <a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoria</a>
    </section>
  </main>`;
  return layout({
    title: `Alternativas a ${tool.name} baratas`,
    description: `Alternativas a ${tool.name} para ${category.audience}, con pros, precio y enlace de prueba.`,
    body,
    relative: ".."
  });
}

function comparisonPage(a, b, category) {
  const rows = [
    ["Mejor para", a.bestFor, b.bestFor],
    ["Precio", a.price, b.price],
    ["Ventaja principal", a.pros[0], b.pros[0]],
    ["Riesgo", a.cons[0], b.cons[0]],
    ["Score", `${a.score}/10`, `${b.score}/10`]
  ];
  const winner = a.score >= b.score ? a : b;
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Comparativa</p>
      <h1>${esc(a.name)} vs ${esc(b.name)}: cual conviene mas</h1>
      <p>Comparativa rapida para elegir herramienta de ${esc(category.name.toLowerCase())} con bajo coste y despliegue rapido.</p>
    </section>
    <section class="section">
      <div class="comparison-table">
        <table>
          <thead><tr><th>Criterio</th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
          <tbody>${rows.map(([label, left, right]) => `<tr><td>${esc(label)}</td><td>${esc(left)}</td><td>${esc(right)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
    <section class="section cta">
      <div>
        <p class="eyebrow">Eleccion rapida</p>
        <h2>Para la mayoria de casos: ${esc(winner.name)}</h2>
        <p>${esc(winner.summary)}</p>
      </div>
      <a class="button primary" href="../${moneyPath(winner.slug)}" rel="sponsored">Ver ${esc(winner.name)}</a>
    </section>
  </main>`;
  return layout({
    title: `${a.name} vs ${b.name}: comparativa rapida`,
    description: `Compara ${a.name} y ${b.name}: precio, caso ideal, pros, riesgos y recomendacion.`,
    body,
    relative: ".."
  });
}

function goPage(tool) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <meta http-equiv="refresh" content="0; url=${esc(tool.affiliateUrl)}">
    <title>Redirigiendo a ${esc(tool.name)}</title>
    <link rel="stylesheet" href="../styles.css">
  </head>
  <body>
    <main class="redirect-page">
      <h1>Redirigiendo a ${esc(tool.name)}</h1>
      <p>Este enlace puede ser afiliado. Si no avanza automaticamente, usa el boton.</p>
      <a class="button primary" href="${esc(tool.affiliateUrl)}" rel="sponsored noopener">Continuar</a>
    </main>
    <script>window.location.replace(${JSON.stringify(tool.affiliateUrl)});</script>
  </body>
</html>`;
}

function legalPage(kind) {
  const isPrivacy = kind === "privacidad";
  const body = `<main class="legal-note">
    <h1>${isPrivacy ? "Privacidad" : "Aviso de afiliados"}</h1>
    <p>${isPrivacy
      ? `Esta web no instala cookies de analitica ni publicidad por defecto. Si anades medicion, formularios o pixeles, actualiza proveedor, finalidad y opciones de baja. Contacto: ${site.email}.`
      : "Esta web puede incluir enlaces de afiliado. Si compras o te registras desde esos enlaces, podemos recibir una comision sin coste adicional para ti."}</p>
    <p>${isPrivacy
      ? "Los datos de herramientas se guardan localmente en ficheros JSON y se publican como paginas estaticas."
      : "Las recomendaciones deben basarse en datos propios, informacion publica y revision editorial. No se publican resenas falsas ni promesas de ingresos."}</p>
  </main>`;
  return layout({ title: `${isPrivacy ? "Privacidad" : "Aviso de afiliados"} | ${site.name}`, description: isPrivacy ? "Politica de privacidad basica." : "Transparencia sobre enlaces de afiliado.", body });
}

function sitemap(paths) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((item) => `  <url><loc>${esc(site.baseUrl)}${esc(item)}</loc></url>`).join("\n")}
</urlset>`;
}

async function writeHtml(relativePath, html, paths) {
  const target = path.join(dist, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
  paths.push(`/${relativePath.replaceAll("\\", "/")}`);
}

async function main() {
  const [tools, categories, manualOffers, scrapedOffers] = await Promise.all([
    readJson("tools.json"),
    readJson("categories.json"),
    readJson("offers.json"),
    readOptionalJson("offers.scraped.json", [])
  ]);
  const offers = [...manualOffers, ...scrapedOffers].slice(0, 24);
  const paths = [];

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
  await copyFile(path.join(root, "styles.css"), path.join(dist, "styles.css"));
  await copyFile(path.join(root, "script.js"), path.join(dist, "script.js"));

  await writeHtml("index.html", homePage(tools, categories, offers), paths);
  await writeHtml("privacidad.html", legalPage("privacidad"), paths);
  await writeHtml("aviso-afiliados.html", legalPage("afiliados"), paths);

  for (const category of categories) {
    await writeHtml(categoryPath(category.slug), categoryPage(category, tools, categories), paths);
  }

  for (const tool of tools) {
    const category = categories.find((item) => item.slug === tool.category);
    const competitors = tools.filter((item) => item.category === tool.category && item.slug !== tool.slug).sort((a, b) => b.score - a.score).slice(0, 3);
    await writeHtml(alternativePath(tool.slug), alternativePage(tool, category, competitors), paths);
    await writeHtml(moneyPath(tool.slug), goPage(tool), paths);
  }

  for (const category of categories) {
    const categoryTools = tools.filter((tool) => tool.category === category.slug).sort((a, b) => b.score - a.score);
    for (let index = 0; index < categoryTools.length - 1; index += 1) {
      const a = categoryTools[index];
      const b = categoryTools[index + 1];
      await writeHtml(comparisonPath(a.slug, b.slug), comparisonPage(a, b, category), paths);
    }
  }

  await writeFile(path.join(dist, "sitemap.xml"), sitemap(paths), "utf8");
  await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n", "utf8");

  if (!existsSync(path.join(root, "dist", "index.html"))) {
    throw new Error("Build failed: dist/index.html was not created");
  }

  console.log(`Generated ${paths.length} HTML pages in dist/`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
