import { mkdir, readFile, rm, writeFile, copyFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const dataDir = path.join(root, "data");

const site = {
  name: "AhorroSaaS",
  description: "Comparativas de software barato, alternativas SaaS y herramientas para automatizar, captar leads y vender con bajo coste.",
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

const normalizeBaseUrl = (url) => String(url ?? "").replace(/\/$/, "");
const absoluteUrl = (pathname) => {
  const base = normalizeBaseUrl(site.baseUrl);
  if (!base) return pathname;
  if (pathname === "/" || pathname === "") return `${base}/`;
  const pathPart = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${pathPart}`;
};
const canonicalPathForFile = (relativePath) => {
  const unix = String(relativePath).replaceAll("\\", "/");
  if (unix === "index.html") return "/";
  return `/${unix}`;
};
const canonicalUrlForFile = (relativePath) => absoluteUrl(canonicalPathForFile(relativePath));
const affiliateDataAttrs = (tool, cta) => ` data-affiliate="1" data-tool="${esc(tool.slug)}" data-cta="${esc(cta)}"`;

const navCrumbs = (segments) => {
  const base = normalizeBaseUrl(site.baseUrl);
  const list = [{ name: "Inicio", url: base ? `${base}/` : "/" }];
  for (const seg of segments) {
    const p = seg.path.startsWith("/") ? seg.path.slice(1) : seg.path;
    list.push({ name: seg.name, url: absoluteUrl(`/${p}`) });
  }
  return list;
};

const baseSchemaEntities = () => {
  const base = normalizeBaseUrl(site.baseUrl);
  if (!base) return [];
  return [
    { "@type": "Organization", "@id": `${base}/#organization`, name: site.name, url: `${base}/` },
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      url: `${base}/`,
      name: site.name,
      description: site.description,
      publisher: { "@id": `${base}/#organization` }
    }
  ];
};

const buildPageSchema = ({ canonical, title, description, breadcrumbs = null, faqItems = [], itemList }) => {
  const base = normalizeBaseUrl(site.baseUrl);
  const graph = [...baseSchemaEntities()];
  if (!canonical || !base) return graph;
  const pageNode = {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    isPartOf: { "@id": `${base}/#website` }
  };
  if (breadcrumbs?.length) {
    pageNode.breadcrumb = { "@id": `${canonical}#breadcrumb` };
  }
  graph.push(pageNode);
  if (breadcrumbs?.length) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: breadcrumbs.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: crumb.url
      }))
    });
  }
  if (faqItems.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer }
      }))
    });
  }
  if (itemList?.length) {
    graph.push({
      "@type": "ItemList",
      "@id": `${canonical}#itemlist`,
      itemListElement: itemList.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        item: it.url
      }))
    });
  }
  return graph;
};

const renderJsonLd = (graph) => {
  if (!graph?.length) return "";
  const payload = { "@context": "https://schema.org", "@graph": graph };
  return `\n    <script type="application/ld+json">${JSON.stringify(payload)}</script>`;
};

const slugify = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const moneyPath = (slug) => `go/${slug}.html`;
const categoryPath = (slug) => `categorias/${slug}.html`;
const alternativePath = (slug) => `alternativas/alternativas-a-${slug}.html`;
const comparisonPath = (a, b) => `comparativas/${a}-vs-${b}.html`;
const useCasePath = (category, useCase) => `casos/${category}-${useCase}.html`;
const keywordPath = (keyword) => `keywords/${slugify(keyword)}.html`;
const pagePath = (slug) => `recursos/${slug}.html`;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value))
    : "fecha por confirmar";
const isAffiliateReady = (tool) => !tool.affiliateUrl.includes("example.com");
const isContactReady = () => site.email && !site.email.includes("example.com");
const byMonetization = (a, b) => Number(isAffiliateReady(b)) - Number(isAffiliateReady(a)) || b.score - a.score;
const offerAction = (tool, relative = ".") => {
  const assetPrefix = relative === "." ? "" : `${relative}/`;
  return isAffiliateReady(tool)
    ? `<a class="card-link" href="${assetPrefix}${moneyPath(tool.slug)}" rel="sponsored"${affiliateDataAttrs(tool, "tool-card")}>Ver herramienta</a>`
    : "";
};

function layout({ title, description, body, canonical = "", relative = ".", robots = "index,follow,max-image-preview:large", schemaGraph = null }) {
  const assetPrefix = relative === "." ? "" : `${relative}/`;
  const canonicalTag = canonical ? `\n    <link rel="canonical" href="${esc(canonical)}">` : "";
  const ogUrlTag = canonical ? `\n    <meta property="og:url" content="${esc(canonical)}">` : "";
  const jsonLd = renderJsonLd(schemaGraph);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="${esc(robots)}">${canonicalTag}${ogUrlTag}
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:type" content="website">${jsonLd}
    <link rel="icon" href="${assetPrefix}assets/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="${assetPrefix}styles.css">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="${assetPrefix}index.html" aria-label="${esc(site.name)}">
        <span class="brand-mark">A</span>
        <span>${esc(site.name)}</span>
      </a>
      <nav class="nav" aria-label="Principal">
        <a href="${assetPrefix}index.html#comparador">Comparador</a>
        <a href="${assetPrefix}index.html#categorias">Categorias</a>
        <a href="${assetPrefix}recursos/metodologia.html">Metodo</a>
        <a href="${assetPrefix}index.html#guia">Guia</a>
      </nav>
    </header>
    ${body}
    <footer class="footer">
      <span>© 2026 ${esc(site.name)}</span>
      <a href="${assetPrefix}privacidad.html">Privacidad</a>
      <a href="${assetPrefix}aviso-afiliados.html">Transparencia</a>
      <a href="${assetPrefix}sitemap.xml">Sitemap</a>
    </footer>
  </body>
</html>`;
}

function editorialNote(relative = ".") {
  const assetPrefix = relative === "." ? "" : `${relative}/`;
  return `<aside class="editorial-note">
    <div>
      <p class="eyebrow">Revision editorial</p>
      <h2>Metodo y transparencia</h2>
      <p>Ultima revision: ${esc(formatDate(site.reviewedAt))}. Ordenamos por coste inicial, facilidad de implantacion, utilidad practica y riesgo operativo. Algunos enlaces pueden ser patrocinados.</p>
    </div>
    <a class="button secondary" href="${assetPrefix}recursos/metodologia.html">Ver metodo</a>
  </aside>`;
}

function faqBlock(items) {
  return `<section class="section faq">
    <p class="eyebrow">Preguntas rapidas</p>
    <h2>Dudas antes de elegir</h2>
    ${items.map((item) => `<details>
      <summary>${esc(item.question)}</summary>
      <p>${esc(item.answer)}</p>
    </details>`).join("")}
  </section>`;
}

function toolCard(tool, categories, relative = ".") {
  const category = categories.find((item) => item.slug === tool.category);
  const ready = isAffiliateReady(tool);
  return `<article class="tool-card${tool.featured ? " featured" : ""}" data-category="${esc(tool.category)}">
    <div class="tool-top">
      <span class="tag">${esc(category?.name ?? tool.category)}</span>
      <span class="price">${esc(tool.price)}</span>
    </div>
    <h3>${esc(tool.name)}</h3>
    <p>${esc(tool.summary)}</p>
    <ul>${tool.pros.slice(0, 3).map((pro) => `<li>${esc(pro)}</li>`).join("")}</ul>
    <div class="score" aria-label="Puntuacion editorial">${esc(tool.score)}/10</div>
    ${offerAction(tool, relative)}
  </article>`;
}

function homePage(tools, categories, offers) {
  const featured = tools.filter(isAffiliateReady).sort(byMonetization).slice(0, 6);
  const publicCategories = categories.filter((category) => tools.some((tool) => tool.category === category.slug && isAffiliateReady(tool)));
  const publicOffers = offers
    .map((offer) => ({ offer, tool: tools.find((item) => item.slug === offer.tool) }))
    .filter(({ tool }) => tool && isAffiliateReady(tool));
  const body = `<main id="top">
    <section class="hero">
      <img class="hero-bg" src="assets/hero.svg" alt="" aria-hidden="true">
      <div class="hero-content">
        <p class="eyebrow">Comparador independiente de software</p>
        <h1>${esc(site.name)}</h1>
        <p class="hero-copy">Comparamos herramientas para automatizar trabajo, mejorar captación y elegir software sin pagar por funciones que todavía no necesitas.</p>
        <p class="hero-sub">Directorio editorial: priorizamos implantación rápida y coste inicial contenido. Las fichas con programa activo enlazan a la web oficial vía rutas internas <code>/go/</code> (transparencia en Transparencia).</p>
        <div class="hero-actions">
          <a class="button primary" href="#comparador">Comparar herramientas</a>
          <a class="button secondary" href="#categorias">Ver categorías</a>
        </div>
      </div>
    </section>
    <section class="trust-strip" aria-label="Avisos importantes">
      <span>Comparativas revisables</span>
      <span>Criterios claros</span>
      <span>Sin promesas de resultados</span>
    </section>
    <section id="comparador" class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Ranking</p>
          <h2>Herramientas recomendadas para empezar</h2>
        </div>
      </div>
      <div class="tool-grid">${featured.map((tool) => toolCard(tool, categories)).join("")}</div>
    </section>
    <section class="section">
      ${editorialNote()}
    </section>
    <section id="categorias" class="section band">
      <div class="section-head">
        <div>
          <p class="eyebrow">Categorías</p>
          <h2>Decisiones habituales de software</h2>
        </div>
      </div>
      <div class="programmatic-grid">
        ${publicCategories.map((category) => `<a class="program-card" href="${categoryPath(category.slug)}">
          <span>${esc(category.name)}</span>
          <strong>Herramientas de ${esc(category.name)}</strong>
          <p>${esc(category.intent)} para ${esc(category.audience)}.</p>
        </a>`).join("")}
      </div>
    </section>
    <section id="guia" class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Puntos de partida</p>
          <h2>Casos donde una herramienta puede ahorrar tiempo</h2>
        </div>
      </div>
      <div class="offer-list">
        ${publicOffers.map(({ offer, tool }) => `<a href="${moneyPath(tool.slug)}" rel="sponsored"${affiliateDataAttrs(tool, "offer-list")}>
            <span>${esc(tool.name)}</span>
            <strong>${esc(offer.label)}</strong>
            <small>${esc(offer.urgency)}</small>
          </a>`).join("")}
      </div>
    </section>
    <section id="newsletter" class="section cta">
      <div>
        <p class="eyebrow">Guia de compra</p>
        <h2>Elige con un caso real, no por una lista de funciones</h2>
        <p>${isContactReady() ? "Recibe nuevas comparativas y guias prácticas cuando se publiquen." : "Antes de pagar una herramienta, define una tarea concreta y mide si te ahorra tiempo o genera oportunidades reales."}</p>
      </div>
      ${isContactReady() ? `<form class="signup" action="mailto:${esc(site.email)}" method="post" enctype="text/plain">
        <label for="email">Email</label>
        <div class="input-row">
          <input id="email" name="email" type="email" placeholder="tu@email.com" required>
          <button class="button primary" type="submit">Apuntarme</button>
        </div>
        <small>Sin spam. Puedes darte de baja cuando quieras.</small>
      </form>` : `<a class="button secondary" href="recursos/metodologia.html">Ver metodologia</a>`}
    </section>
  </main>
  <script src="script.js"></script>`;
  const homeCanonical = canonicalUrlForFile("index.html");
  const itemListFeatured = featured.map((tool) => ({ name: tool.name, url: absoluteUrl(`/${moneyPath(tool.slug)}`) }));
  const homeTitle = `${site.name} | Comparador de software para pequenos negocios`;
  return layout({
    title: homeTitle,
    description: site.description,
    body,
    canonical: homeCanonical,
    schemaGraph: buildPageSchema({
      canonical: homeCanonical,
      title: homeTitle,
      description: site.description,
      breadcrumbs: null,
      faqItems: [],
      itemList: itemListFeatured
    })
  });
}

function panelPage(tools, categories) {
  const realLinks = tools.filter((tool) => !tool.affiliateUrl.includes("example.com")).length;
  const placeholderLinks = tools.length - realLinks;
  const rows = [...tools]
    .sort((a, b) => {
      const aPending = a.affiliateUrl.includes("example.com") ? 1 : 0;
      const bPending = b.affiliateUrl.includes("example.com") ? 1 : 0;
      return aPending - bPending || a.category.localeCompare(b.category) || b.score - a.score;
    })
    .map((tool) => {
      const category = categories.find((item) => item.slug === tool.category);
      const ready = !tool.affiliateUrl.includes("example.com");
      return `<tr data-status="${ready ? "ready" : "pending"}" data-category="${esc(tool.category)}">
        <td><strong>${esc(tool.name)}</strong><small>${esc(category?.name ?? tool.category)}</small></td>
        <td><span class="status ${ready ? "ready" : "pending"}">${ready ? "Activo" : "Pendiente"}</span></td>
        <td><code>/${esc(moneyPath(tool.slug))}</code></td>
        <td><a href="${esc(moneyPath(tool.slug))}" target="_blank" rel="noopener">Probar /go</a></td>
        <td><a href="${esc(tool.affiliateUrl)}" target="_blank" rel="noopener sponsored">Destino</a></td>
        <td>${esc(tool.score)}/10</td>
      </tr>`;
    })
    .join("");

  const body = `<main>
    <section class="page-hero panel-hero">
      <p class="eyebrow">Panel operativo</p>
      <h1>Seguimiento de enlaces afiliados</h1>
      <p>Inventario rapido de rutas internas, destinos afiliados y enlaces pendientes. Las visitas reales a <code>/go/*</code> se revisan en Cloudflare Web Analytics.</p>
    </section>
    <section class="section panel-stats">
      <article><span>${tools.length}</span><strong>Herramientas</strong></article>
      <article><span>${realLinks}</span><strong>Enlaces activos</strong></article>
      <article><span>${placeholderLinks}</span><strong>Pendientes</strong></article>
      <article><span>${categories.length}</span><strong>Categorias</strong></article>
    </section>
    <section class="section panel-controls">
      <button class="filter active" data-panel-filter="all" type="button">Todo</button>
      <button class="filter" data-panel-filter="ready" type="button">Activos</button>
      <button class="filter" data-panel-filter="pending" type="button">Pendientes</button>
    </section>
    <section class="section panel-table-wrap">
      <div class="comparison-table">
        <table class="panel-table">
          <thead><tr><th>Herramienta</th><th>Estado</th><th>Ruta interna</th><th>Test</th><th>Destino</th><th>Score</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
    <section class="section editorial-note">
      <div>
        <p class="eyebrow">Medicion</p>
        <h2>Como leer clicks</h2>
        <p>En Cloudflare Web Analytics filtra rutas que empiecen por <code>/go/</code>. Cada visita a una ruta interna representa un click saliente antes de redirigir al afiliado.</p>
        <p>Los enlaces de salida llevan <code>data-affiliate</code>, <code>data-tool</code> y <code>data-cta</code> para segmentar en etiquetas personalizadas o scripts de analítica sin backend.</p>
      </div>
      <a class="button secondary" href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Abrir Cloudflare</a>
    </section>
  </main>
  <script>
    document.querySelectorAll("[data-panel-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.panelFilter;
        document.querySelectorAll("[data-panel-filter]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        document.querySelectorAll(".panel-table tbody tr").forEach((row) => {
          row.classList.toggle("hidden", filter !== "all" && row.dataset.status !== filter);
        });
      });
    });
  </script>`;

  return layout({
    title: `Panel de afiliados | ${site.name}`,
    description: "Panel operativo no indexable para revisar enlaces afiliados.",
    body,
    robots: "noindex,nofollow",
    canonical: canonicalUrlForFile("panel.html"),
    schemaGraph: null
  });
}

function useCasePage(useCase, category, tools, categories) {
  const matching = tools.filter((tool) => tool.category === category.slug).sort(byMonetization);
  const top = matching.find(isAffiliateReady) ?? matching[0];
  const rel = useCasePath(category.slug, useCase.slug);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `Herramientas de ${category.name.toLowerCase()} para ${useCase.name}`;
  const pageDescription = `Opciones prácticas de ${category.name} para ${useCase.name}: ${useCase.problem}.`;
  const faqItems = [
      { question: `Que herramienta de ${category.name.toLowerCase()} conviene probar primero?`, answer: `Empieza por ${top.name} si necesitas una opcion equilibrada para ${useCase.name}. Despues compara limites, precio al escalar y facilidad de exportacion.` },
      { question: "Hace falta pagar desde el primer dia?", answer: "No necesariamente. Para validar, prioriza planes gratuitos, pruebas o pago por uso antes de comprometerte a una suscripcion anual." }
    ];
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Caso de uso</p>
      <h1>Herramientas de ${esc(category.name)} para ${esc(useCase.name)}</h1>
      <p>Selección práctica para ${esc(useCase.problem)} sin empezar por una suite sobredimensionada.</p>
      <p class="page-lead">Enfoque para <strong>${esc(category.audience)}</strong>: buscamos encaje con ${esc(category.intent)} antes de ampliar el stack.</p>
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Diagnóstico rápido</p>
        <h2>Cuándo tiene sentido usar una herramienta</h2>
        <p>Antes de elegir, define una tarea observable: un formulario conectado, una secuencia enviada, una auditoría terminada o una página publicada. Si no puedes comprobar el resultado en una semana, conviene simplificar.</p>
      </div>
      <ul class="keyword-list">
        <li>Empieza con una prueba o plan gratuito cuando exista.</li>
        <li>Evita migraciones completas antes de validar un flujo real.</li>
        <li>Comprueba límites, exportación de datos y coste al escalar.</li>
      </ul>
    </section>
    <section class="section">
      <div class="tool-grid">${matching.map((tool) => toolCard(tool, categories, "..")).join("")}</div>
    </section>
    <section class="section">
      ${editorialNote("..")}
    </section>
    <section class="section cta">
      <div>
        <p class="eyebrow">Recomendacion inicial</p>
        <h2>Empieza probando ${esc(top.name)}</h2>
        <p>${esc(top.summary)}</p>
      </div>
      ${isAffiliateReady(top)
        ? `<a class="button primary" href="../${moneyPath(top.slug)}" rel="sponsored"${affiliateDataAttrs(top, "use-case-cta")}>Ver ${esc(top.name)}</a>`
        : `<a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoria</a>`}
    </section>
    ${faqBlock(faqItems)}
  </main>`;
  return layout({
    title: pageTitle,
    description: pageDescription,
    body,
    relative: "..",
    canonical,
    schemaGraph: buildPageSchema({
      canonical,
      title: pageTitle,
      description: pageDescription,
      breadcrumbs: navCrumbs([
        { name: category.name, path: categoryPath(category.slug) },
        { name: useCase.name, path: rel }
      ]),
      faqItems
    })
  });
}

function keywordPage(keyword, category, tools, categories) {
  const matching = tools.filter((tool) => tool.category === category.slug).sort(byMonetization);
  const top = matching.find(isAffiliateReady) ?? matching[0];
  const rel = keywordPath(keyword);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `${keyword}: comparativa practica`;
  const pageDescription = `Comparativa rapida para ${keyword}, con herramientas de coste controlado y criterios claros.`;
  const faqItems = [
      { question: `Como elegir para "${keyword}"?`, answer: "Filtra por la tarea que quieres resolver esta semana, no por la lista de funciones. La mejor herramienta inicial suele ser la que puedes probar con datos reales hoy." },
      { question: "Puedo combinar varias herramientas?", answer: "Si, pero empieza con una herramienta principal y una automatizacion sencilla. Muchas combinaciones aumentan el coste oculto." }
    ];
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Guía comparativa</p>
      <h1>${esc(keyword)}: opciones asequibles y faciles de probar</h1>
      <p>Comparativa práctica para elegir herramientas de ${esc(category.name)} con coste controlado y poca fricción de implantación.</p>
      <p class="page-lead">Contexto de búsqueda &quot;${esc(keyword)}&quot; dentro de <strong>${esc(category.name)}</strong>: útil si tu perfil es ${esc(category.audience)}.</p>
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Cómo leer esta comparativa</p>
        <h2>Qué mirar antes del precio</h2>
        <p>El precio solo importa después de confirmar que la herramienta resuelve tu caso. Revisa primero el tiempo de puesta en marcha, los límites del plan inicial y si puedes salir sin perder datos.</p>
      </div>
      <ul class="keyword-list">
        <li>Mejor primera prueba: ${esc(top.name)}.</li>
        <li>Criterio principal: ${esc(category.intent)}.</li>
        <li>Riesgo a vigilar: pagar por funciones que no vas a usar.</li>
      </ul>
    </section>
    <section class="section">
      <div class="comparison-table">
        <table>
          <thead><tr><th>Herramienta</th><th>Uso recomendado</th><th>Precio</th><th>Riesgo principal</th><th></th></tr></thead>
          <tbody>
            ${matching.map((tool) => `<tr>
              <td><strong>${esc(tool.name)}</strong></td>
              <td>${esc(tool.bestFor)}</td>
              <td>${esc(tool.price)}</td>
              <td>${esc(tool.cons[0])}</td>
              <td>${isAffiliateReady(tool) ? `<a href="../${moneyPath(tool.slug)}" rel="sponsored"${affiliateDataAttrs(tool, "keyword-table")}>Ver</a>` : `<span class="muted">Enlace en revisión editorial</span>`}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="section">
      ${editorialNote("..")}
    </section>
    <section class="section">
      <p class="eyebrow">Siguiente paso</p>
      <h2>Comparar dentro de ${esc(category.name)}</h2>
      <p>${esc(category.intent)}.</p>
      <a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoria</a>
    </section>
    ${faqBlock(faqItems)}
  </main>`;
  return layout({
    title: pageTitle,
    description: pageDescription,
    body,
    relative: "..",
    canonical,
    schemaGraph: buildPageSchema({
      canonical,
      title: pageTitle,
      description: pageDescription,
      breadcrumbs: navCrumbs([
        { name: category.name, path: categoryPath(category.slug) },
        { name: keyword, path: rel }
      ]),
      faqItems
    })
  });
}

function categoryPage(category, tools, categories) {
  const matching = tools.filter((tool) => tool.category === category.slug).sort(byMonetization);
  const rel = categoryPath(category.slug);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `Herramientas de ${category.name} comparadas`;
  const pageDescription = `Comparativa de herramientas de ${category.name} para ${category.audience}.`;
  const faqItems = [
      { question: `Que priorizar en ${category.name}?`, answer: "Coste inicial, rapidez para probar un caso real y claridad de limites. Evita pagar por funciones avanzadas antes de validar uso." },
      { question: "Como medimos el retorno?", answer: "Mide clicks, leads, horas ahorradas o publicaciones terminadas. Si no hay metrica, no hay decision objetiva." }
    ];
  const itemList = matching.map((tool) => ({ name: tool.name, url: absoluteUrl(`/${moneyPath(tool.slug)}`) }));
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Categoria</p>
      <h1>Herramientas de ${esc(category.name)} para ${esc(category.audience)}</h1>
      <p>${esc(category.intent)}. Seleccion basada en coste inicial, facilidad de implantacion y potencial de retorno.</p>
      <p class="page-lead">Aquí filtramos por casos reales de ${esc(category.audience)}, no por el catálogo completo de funciones de cada vendor.</p>
    </section>
    <section class="section">
      <div class="tool-grid">${matching.map((tool) => toolCard(tool, categories, "..")).join("")}</div>
    </section>
    <section class="section">
      ${editorialNote("..")}
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Keywords objetivo</p>
        <h2>Búsquedas relacionadas</h2>
      </div>
      <ul class="keyword-list">${category.keywords.map((keyword) => `<li>${esc(keyword)}</li>`).join("")}</ul>
    </section>
    ${faqBlock(faqItems)}
  </main>`;
  return layout({
    title: pageTitle,
    description: pageDescription,
    body,
    relative: "..",
    canonical,
    schemaGraph: buildPageSchema({
      canonical,
      title: pageTitle,
      description: pageDescription,
      breadcrumbs: navCrumbs([{ name: category.name, path: rel }]),
      faqItems,
      itemList
    })
  });
}

function alternativePage(tool, category, competitors) {
  const options = [tool, ...competitors].sort(byMonetization);
  const practicalPick = options.find(isAffiliateReady) ?? options[0];
  const rel = alternativePath(tool.slug);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `Alternativas a ${tool.name}`;
  const pageDescription = `Alternativas a ${tool.name} para ${category.audience}, con pros, precio y enlace de prueba.`;
  const faqItems = [
      { question: `Por que buscar alternativas a ${tool.name}?`, answer: "Normalmente por precio, limites del plan, curva de aprendizaje o falta de integraciones concretas. Compara con un caso real antes de migrar." },
      { question: "La alternativa mas barata siempre compensa?", answer: "No. La opcion barata solo compensa si resuelve la tarea sin anadir demasiado mantenimiento o friccion operativa." }
    ];
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Alternativas</p>
      <h1>Alternativas a ${esc(tool.name)} con coste controlado</h1>
      <p>${esc(tool.summary)} Si no encaja por precio, curva de aprendizaje o límites del plan, estas opciones cubren casos parecidos.</p>
      <p class="page-lead">Misma categoría (${esc(category.name)}), distinto encaje: comparamos ${esc(tool.name)} con otras opciones para ${esc(category.audience)}.</p>
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Antes de cambiar</p>
        <h2>La alternativa correcta depende del bloqueo</h2>
        <p>No busques una copia exacta. Identifica qué falla: coste, complejidad, integraciones, límites o soporte. Con esa restricción clara, la comparación deja de ser una lista genérica.</p>
      </div>
      <ul class="keyword-list">
        <li>Si el problema es precio, revisa límites del plan barato.</li>
        <li>Si el problema es complejidad, prioriza configuración rápida.</li>
        <li>Si el problema es crecimiento, revisa coste al escalar.</li>
      </ul>
    </section>
    <section class="section">
      <div class="comparison-table">
        <table>
          <thead><tr><th>Herramienta</th><th>Ideal para</th><th>Ventaja</th><th>Riesgo</th><th></th></tr></thead>
          <tbody>
            ${options.map((item) => `<tr>
              <td><strong>${esc(item.name)}</strong></td>
              <td>${esc(item.bestFor)}</td>
              <td>${esc(item.pros[0])}</td>
              <td>${esc(item.cons[0])}</td>
              <td>${isAffiliateReady(item) ? `<a href="../${moneyPath(item.slug)}" rel="sponsored"${affiliateDataAttrs(item, "alternatives-table")}>Ver</a>` : `<span class="muted">Enlace en revisión editorial</span>`}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="section cta">
      <div>
        <p class="eyebrow">Opción práctica</p>
        <h2>Empieza comparando ${esc(practicalPick.name)}</h2>
        <p>${esc(practicalPick.summary)}</p>
      </div>
      ${isAffiliateReady(practicalPick)
        ? `<a class="button primary" href="../${moneyPath(practicalPick.slug)}" rel="sponsored"${affiliateDataAttrs(practicalPick, "alternatives-cta")}>Ver ${esc(practicalPick.name)}</a>`
        : `<a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoria</a>`}
    </section>
    <section class="section">
      ${editorialNote("..")}
    </section>
    <section class="section">
      <p class="eyebrow">Categoria relacionada</p>
      <h2>${esc(category.name)}</h2>
      <p>${esc(category.intent)}.</p>
      <a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoria</a>
    </section>
    ${faqBlock(faqItems)}
  </main>`;
  return layout({
    title: pageTitle,
    description: pageDescription,
    body,
    relative: "..",
    canonical,
    schemaGraph: buildPageSchema({
      canonical,
      title: pageTitle,
      description: pageDescription,
      breadcrumbs: navCrumbs([
        { name: category.name, path: categoryPath(category.slug) },
        { name: `Alternativas a ${tool.name}`, path: rel }
      ]),
      faqItems
    })
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
  const winner = isAffiliateReady(a) === isAffiliateReady(b) ? (a.score >= b.score ? a : b) : (isAffiliateReady(a) ? a : b);
  const other = winner.slug === a.slug ? b : a;
  const rel = comparisonPath(a.slug, b.slug);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `${a.name} vs ${b.name}: comparativa rapida`;
  const pageDescription = `Compara ${a.name} y ${b.name}: precio, caso ideal, pros, riesgos y recomendacion.`;
  const faqItems = [
      { question: `Cuando elegir ${a.name}?`, answer: `${a.name} encaja mejor si tu prioridad es ${a.bestFor}. Revisa sus limites antes de pagar.` },
      { question: `Cuando elegir ${b.name}?`, answer: `${b.name} encaja mejor si tu prioridad es ${b.bestFor}. Pruebalo con un flujo real antes de migrar.` }
    ];
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Comparativa</p>
      <h1>${esc(a.name)} vs ${esc(b.name)}: cual conviene mas</h1>
      <p>Comparativa rápida para decidir entre dos herramientas de ${esc(category.name)} según uso, coste inicial, límites y facilidad de adopción.</p>
      <p class="page-lead">Dentro de <strong>${esc(category.name)}</strong>, esta página contrasta dos herramientas típicas para ${esc(category.audience)}.</p>
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Resumen ejecutivo</p>
        <h2>Elige según el trabajo que necesitas resolver</h2>
        <p>${esc(winner.name)} es la opción más equilibrada si priorizas ${esc(winner.bestFor)}. ${esc(other.name)} puede encajar mejor si su ventaja principal pesa más en tu caso concreto.</p>
      </div>
      <ul class="keyword-list">
        <li>${esc(a.name)} destaca por: ${esc(a.pros[0])}.</li>
        <li>${esc(b.name)} destaca por: ${esc(b.pros[0])}.</li>
        <li>No decidas solo por score: valida un flujo real.</li>
      </ul>
    </section>
    <section class="section">
      <div class="comparison-table">
        <table>
          <thead><tr><th>Criterio</th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
          <tbody>${rows.map(([label, left, right]) => `<tr><td>${esc(label)}</td><td>${esc(left)}</td><td>${esc(right)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
    <section class="section">
      ${editorialNote("..")}
    </section>
    <section class="section cta">
      <div>
        <p class="eyebrow">Eleccion rapida</p>
        <h2>Para la mayoria de casos: ${esc(winner.name)}</h2>
        <p>${esc(winner.summary)}</p>
      </div>
      ${isAffiliateReady(winner)
        ? `<a class="button primary" href="../${moneyPath(winner.slug)}" rel="sponsored"${affiliateDataAttrs(winner, "comparison-cta")}>Ver ${esc(winner.name)}</a>`
        : `<a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoria</a>`}
    </section>
    ${faqBlock(faqItems)}
  </main>`;
  return layout({
    title: pageTitle,
    description: pageDescription,
    body,
    relative: "..",
    canonical,
    schemaGraph: buildPageSchema({
      canonical,
      title: pageTitle,
      description: pageDescription,
      breadcrumbs: navCrumbs([
        { name: category.name, path: categoryPath(category.slug) },
        { name: `${a.name} vs ${b.name}`, path: rel }
      ]),
      faqItems
    })
  });
}

function resourcePage(page) {
  const rel = pagePath(page.slug);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `${page.title} | ${site.name}`;
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Recurso editorial</p>
      <h1>${esc(page.title)}</h1>
      <p>${esc(page.description)}</p>
    </section>
    <section class="section resource">
      ${page.sections.map((section) => `<article>
        <h2>${esc(section.heading)}</h2>
        <p>${esc(section.body)}</p>
      </article>`).join("")}
    </section>
    <section class="section">
      ${editorialNote("..")}
    </section>
  </main>`;
  return layout({
    title: pageTitle,
    description: page.description,
    body,
    relative: "..",
    canonical,
    schemaGraph: buildPageSchema({
      canonical,
      title: pageTitle,
      description: page.description,
      breadcrumbs: navCrumbs([{ name: page.title, path: rel }]),
      faqItems: []
    })
  });
}

function goPage(tool) {
  const goCanonical = canonicalUrlForFile(moneyPath(tool.slug));
  if (!isAffiliateReady(tool)) {
    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <link rel="canonical" href="${esc(goCanonical)}">
    <title>Enlace pendiente de ${esc(tool.name)}</title>
    <link rel="stylesheet" href="../styles.css">
  </head>
  <body>
    <main class="redirect-page">
      <h1>${esc(tool.name)}</h1>
      <p>El programa de afiliación o la URL oficial de esta herramienta está pendiente de validación editorial; por eso no redirigimos aún a una oferta.</p>
      <a class="button secondary" href="../index.html#comparador">Volver al comparador</a>
    </main>
  </body>
</html>`;
  }

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <link rel="canonical" href="${esc(goCanonical)}">
    <meta http-equiv="refresh" content="0; url=${esc(tool.affiliateUrl)}">
    <title>Redirigiendo a ${esc(tool.name)}</title>
    <link rel="stylesheet" href="../styles.css">
  </head>
  <body>
    <main class="redirect-page">
      <h1>Redirigiendo a ${esc(tool.name)}</h1>
      <p>Este enlace puede ser afiliado. Si no avanza automaticamente, usa el boton.</p>
      <a class="button primary" href="${esc(tool.affiliateUrl)}" rel="sponsored noopener"${affiliateDataAttrs(tool, "go-landing")}>Continuar</a>
    </main>
    <script>window.location.replace(${JSON.stringify(tool.affiliateUrl)});</script>
  </body>
</html>`;
}

function legalPage(kind) {
  const isPrivacy = kind === "privacidad";
  const contactLine = isContactReady()
    ? `Contacto: ${site.email}.`
    : "Contacto: pendiente de configuración (añade un email real en data/site.json).";
  const body = `<main class="legal-note">
    <h1>${isPrivacy ? "Privacidad" : "Aviso de afiliados"}</h1>
    <p>${isPrivacy
      ? `Esta web no instala cookies de analitica ni publicidad por defecto. Si anades medicion, formularios o pixeles, actualiza proveedor, finalidad y opciones de baja. ${contactLine}`
      : "Esta web puede incluir enlaces de afiliado. Si compras o te registras desde esos enlaces, podemos recibir una comision sin coste adicional para ti."}</p>
    <p>${isPrivacy
      ? "Los datos de herramientas se guardan localmente en ficheros JSON y se publican como paginas estaticas."
      : "Las recomendaciones deben basarse en datos propios, informacion publica y revision editorial. No se publican resenas falsas ni promesas de ingresos."}</p>
  </main>`;
  const rel = isPrivacy ? "privacidad.html" : "aviso-afiliados.html";
  const canonical = canonicalUrlForFile(rel);
  const title = `${isPrivacy ? "Privacidad" : "Aviso de afiliados"} | ${site.name}`;
  const description = isPrivacy ? "Politica de privacidad basica." : "Transparencia sobre enlaces de afiliado.";
  return layout({
    title,
    description,
    body,
    canonical,
    schemaGraph: buildPageSchema({
      canonical,
      title,
      description,
      breadcrumbs: navCrumbs([{ name: isPrivacy ? "Privacidad" : "Transparencia", path: rel }]),
      faqItems: []
    })
  });
}

function sitemap(paths) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((item) => `  <url><loc>${esc(absoluteUrl(item))}</loc></url>`).join("\n")}
</urlset>`;
}

function headersFile() {
  return `/go/*
  X-Robots-Tag: noindex, nofollow

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`;
}

async function writeHtml(relativePath, html, paths, options = {}) {
  const target = path.join(dist, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
  if (options.indexable !== false) {
    const unix = relativePath.replaceAll("\\", "/");
    paths.push(unix === "index.html" ? "/" : `/${unix}`);
  }
}

async function main() {
  const [siteConfig, tools, categories, useCases, pages, manualOffers, scrapedOffers] = await Promise.all([
    readOptionalJson("site.json", {}),
    readJson("tools.json"),
    readJson("categories.json"),
    readJson("use-cases.json"),
    readJson("pages.json"),
    readJson("offers.json"),
    readOptionalJson("offers.scraped.json", [])
  ]);
  Object.assign(site, siteConfig);
  const offers = [...manualOffers, ...scrapedOffers].slice(0, 24);
  const paths = [];

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
  await copyFile(path.join(root, "styles.css"), path.join(dist, "styles.css"));
  await copyFile(path.join(root, "script.js"), path.join(dist, "script.js"));

  await writeHtml("index.html", homePage(tools, categories, offers), paths);
  await writeHtml("panel.html", panelPage(tools, categories), paths, { indexable: false });
  await writeHtml("privacidad.html", legalPage("privacidad"), paths);
  await writeHtml("aviso-afiliados.html", legalPage("afiliados"), paths);

  for (const page of pages) {
    await writeHtml(pagePath(page.slug), resourcePage(page), paths);
  }

  for (const category of categories) {
    await writeHtml(categoryPath(category.slug), categoryPage(category, tools, categories), paths);

    for (const keyword of category.keywords) {
      await writeHtml(keywordPath(keyword), keywordPage(keyword, category, tools, categories), paths);
    }
  }

  for (const tool of tools) {
    const category = categories.find((item) => item.slug === tool.category);
    const competitors = tools.filter((item) => item.category === tool.category && item.slug !== tool.slug).sort(byMonetization).slice(0, 3);
    await writeHtml(alternativePath(tool.slug), alternativePage(tool, category, competitors), paths);
    await writeHtml(moneyPath(tool.slug), goPage(tool), paths, { indexable: false });
  }

  for (const category of categories) {
    const categoryTools = tools.filter((tool) => tool.category === category.slug).sort(byMonetization);
    for (let left = 0; left < categoryTools.length - 1; left += 1) {
      for (let right = left + 1; right < categoryTools.length; right += 1) {
        const a = categoryTools[left];
        const b = categoryTools[right];
        await writeHtml(comparisonPath(a.slug, b.slug), comparisonPage(a, b, category), paths);
      }
    }
  }

  for (const useCase of useCases) {
    const category = categories.find((item) => item.slug === useCase.category);
    if (!category) continue;
    await writeHtml(useCasePath(category.slug, useCase.slug), useCasePage(useCase, category, tools, categories), paths);
  }

  await writeFile(path.join(dist, "sitemap.xml"), sitemap(paths), "utf8");
  await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`, "utf8");
  await writeFile(path.join(dist, "_headers"), headersFile(), "utf8");

  if (!existsSync(path.join(root, "dist", "index.html"))) {
    throw new Error("Build failed: dist/index.html was not created");
  }

  console.log(`Generated ${paths.length} HTML pages in dist/`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
