import { mkdir, readFile, rm, writeFile, copyFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const dataDir = path.join(root, "data");

const site = {
  name: "AhorroSaaS",
  description:
    "Guías y comparativas de software asequible para automatizar, captar leads y vender sin pagar suites de más: criterios claros y transparencia con afiliación.",
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
const toolReviewPath = (slug) => `herramientas/${slug}.html`;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value))
    : "fecha por confirmar";
const hasPlaceholderAffiliateUrl = (tool) => !tool.affiliateUrl || tool.affiliateUrl.includes("example.com");
const isAffiliateReady = (tool) => !hasPlaceholderAffiliateUrl(tool) && (tool.affiliateStatus ? tool.affiliateStatus === "active" : true);
const isContactReady = () => site.email && !site.email.includes("example.com");
const byMonetization = (a, b) => Number(isAffiliateReady(b)) - Number(isAffiliateReady(a)) || b.score - a.score;
const offerAction = (tool, relative = ".") => {
  const assetPrefix = relative === "." ? "" : `${relative}/`;
  return isAffiliateReady(tool)
    ? `<a class="card-link" href="${assetPrefix}${moneyPath(tool.slug)}" rel="sponsored"${affiliateDataAttrs(tool, "tool-card")}>Empezar prueba</a>`
    : "";
};

const activeToolLinks = (tools, relative = ".") => {
  const assetPrefix = relative === "." ? "" : `${relative}/`;
  const active = tools.filter(isAffiliateReady).sort(byMonetization).slice(0, 6);
  if (!active.length) return "";
  return `<section class="section money-strip">
    <div class="section-head">
      <div>
        <p class="eyebrow">Comparativas destacadas</p>
        <h2>Herramientas listas para evaluar</h2>
        <p class="section-lead">Fichas prácticas con precio inicial, límites relevantes y una recomendación de uso antes de contratar.</p>
      </div>
    </div>
    <div class="money-grid">
      ${active.map((tool) => `<article class="money-card">
        <span>${esc(tool.name)}</span>
        <strong>${esc(tool.bestFor)}</strong>
        <p>${esc(tool.summary)}</p>
        <div class="money-actions">
          <a href="${assetPrefix}${toolReviewPath(tool.slug)}">Ver análisis</a>
          <a href="${assetPrefix}${moneyPath(tool.slug)}" rel="sponsored"${affiliateDataAttrs(tool, "money-strip")}>Empezar prueba</a>
        </div>
      </article>`).join("")}
    </div>
  </section>`;
};

const fontHeadTags = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">`;

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
    ${fontHeadTags}
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
        <a href="${assetPrefix}index.html#categorias">Categorías</a>
        <a href="${assetPrefix}recursos/metodologia.html">Método</a>
        <a href="${assetPrefix}index.html#guia">Guía</a>
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
      <p class="eyebrow">Revisión editorial</p>
      <h2>Método y transparencia</h2>
      <p>Última revisión: ${esc(formatDate(site.reviewedAt))}. Ordenamos por coste inicial, facilidad de implantación, utilidad práctica y riesgo operativo. Algunas salidas a proveedores pueden ser enlaces de afiliado, siempre sin coste extra para ti.</p>
    </div>
    <a class="button secondary" href="${assetPrefix}recursos/metodologia.html">Ver criterios</a>
  </aside>`;
}

function faqBlock(items) {
  return `<section class="section faq">
    <p class="eyebrow">Preguntas rápidas</p>
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
  const pendingNote = ready
    ? ""
    : `<p class="tool-pending-note">Aún no hemos validado una prueba o enlace directo para <strong>${esc(tool.name)}</strong>. Mantén esta opción como referencia y compara límites antes de contratar.</p>`;
  return `<article class="tool-card${tool.featured ? " featured" : ""}${ready ? "" : " pending"}" data-category="${esc(tool.category)}">
    <div class="tool-top">
      <span class="tag">${esc(category?.name ?? tool.category)}</span>
      <span class="price">${esc(tool.price)}</span>
    </div>
    <h3>${esc(tool.name)}</h3>
    <p>${esc(tool.summary)}</p>
    <ul>${tool.pros.slice(0, 3).map((pro) => `<li>${esc(pro)}</li>`).join("")}</ul>
    <div class="score" aria-label="Puntuación editorial">${esc(tool.score)}/10</div>
    ${pendingNote}
    ${offerAction(tool, relative)}
  </article>`;
}

function homePage(tools, categories, offers, allCats) {
  const featured = tools.filter(isAffiliateReady).sort(byMonetization).slice(0, 6);
  const publicCategories = categories.filter((category) => tools.some((tool) => tool.category === category.slug && isAffiliateReady(tool)));
  const visibleCategories = allCats ?? publicCategories;
  const publicOffers = offers
    .map((offer) => ({ offer, tool: tools.find((item) => item.slug === offer.tool) }))
    .filter(({ tool }) => tool && isAffiliateReady(tool));
  const body = `<main id="top">
    <section class="hero">
      <img class="hero-bg" src="assets/hero.svg" alt="" aria-hidden="true">
      <div class="hero-content">
        <p class="eyebrow">${esc(site.name)}</p>
        <h1>Herramientas de software asequibles para pequeños negocios</h1>
        <p class="hero-copy">Comparamos SaaS de automatización, email marketing, SEO, IA y más para que elijas con criterio y no pagues por funciones que no vas a usar.</p>
        <p class="hero-sub">Criterios editoriales: implantación rápida, precio inicial razonable y riesgo operativo bajo. Algunas recomendaciones incluyen enlaces de afiliado; puedes leer el <a href="aviso-afiliados.html">aviso de transparencia</a>.</p>
        <div class="hero-actions">
          <a class="button primary" href="#comparador">Ver herramientas</a>
          <a class="button secondary" href="#categorias">Explorar categorías</a>
        </div>
      </div>
    </section>
    <section class="trust-strip" aria-label="Métricas del comparador">
      <span>33 herramientas comparadas</span>
      <span>8 categorías de software</span>
      <span>5 programas de afiliación verificados</span>
      <span>Actualizado mayo 2026</span>
    </section>
    <section id="comparador" class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Ranking</p>
          <h2>Herramientas con las que suele tener sentido empezar</h2>
          <p class="section-lead">Priorizamos opciones con buen encaje para presupuestos ajustados, pruebas razonables y riesgos claros antes de pagar.</p>
        </div>
      </div>
      <div class="tool-grid">${featured.map((tool) => toolCard(tool, categories)).join("")}</div>
    </section>
    ${activeToolLinks(tools)}
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
        ${visibleCategories.map((category) => `<a class="program-card" href="${categoryPath(category.slug)}">
          <span>${esc(category.name)}</span>
          <strong>Herramientas de ${esc(category.name)}</strong>
          <p>${esc(category.intent)} para ${esc(category.audience)}.</p>
        </a>`).join("")}
      </div>
    </section>
    <section id="comparativas" class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Comparativas</p>
          <h2>Las dudas más habituales antes de elegir</h2>
          <p class="section-lead">Análisis directos entre las opciones más consultadas en cada categoría.</p>
        </div>
      </div>
      <div class="comp-grid">
        ${[
          { a: "make",       na: "Make",        b: "zapier",        nb: "Zapier" },
          { a: "mangools",   na: "Mangools",     b: "semrush",       nb: "SEMrush" },
          { a: "getresponse",na: "GetResponse",  b: "mailerlite",    nb: "MailerLite" },
          { a: "lowfruits",  na: "LowFruits",    b: "ahrefs",        nb: "Ahrefs" },
          { a: "systeme-io", na: "systeme.io",   b: "activecampaign",nb: "ActiveCampaign" },
          { a: "nordvpn",    na: "NordVPN",      b: "surfshark",     nb: "Surfshark" },
          { a: "hubspot",    na: "HubSpot",      b: "pipedrive",     nb: "Pipedrive" },
          { a: "n8n",        na: "n8n",          b: "zapier",        nb: "Zapier" },
          { a: "cloudways",  na: "Cloudways",    b: "hostinger",     nb: "Hostinger" },
          { a: "chatgpt",    na: "ChatGPT",      b: "notion",        nb: "Notion" },
          { a: "brevo",      na: "Brevo",        b: "mailerlite",    nb: "MailerLite" },
          { a: "mangools",   na: "Mangools",     b: "ahrefs",        nb: "Ahrefs" },
        ].map(({ a, na, b, nb }) => `<a class="comp-card" href="${comparisonPath(a, b)}">
            <span>${esc(na)}</span>
            <em>vs</em>
            <span>${esc(nb)}</span>
          </a>`).join("")}
      </div>
    </section>
    <section id="guia" class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Por caso de uso</p>
          <h2>¿Cuál es tu objetivo concreto?</h2>
          <p class="section-lead">Elige el escenario más cercano a tu situación y ve directamente al análisis que lo cubre.</p>
        </div>
      </div>
      <div class="offer-list">
        ${featured.map((tool) => `<a href="herramientas/${esc(tool.slug)}.html"${affiliateDataAttrs(tool, "use-case-list")}>
            <span>${esc(tool.name)}</span>
            <strong>${esc(tool.summary)}</strong>
            <small>Mejor para: ${esc(tool.bestFor)}</small>
          </a>`).join("")}
      </div>
    </section>
    <section id="newsletter" class="section cta">
      <div>
        <p class="eyebrow">Antes de pagar</p>
        <h2>Define una tarea concreta y compruébala en la prueba</h2>
        <p>El error habitual es contratar por el plan, no por el caso de uso. Aquí comparamos herramientas con criterios explícitos: coste inicial, límites del plan gratuito, curva de aprendizaje y riesgo de dependencia.</p>
      </div>
      <div class="cta-actions">
        <a class="button primary" href="#comparativas">Ver comparativas</a>
        <a class="button secondary" href="recursos/metodologia.html">Leer el método</a>
      </div>
    </section>
  </main>
  <script src="script.js"></script>`;
  const homeCanonical = canonicalUrlForFile("index.html");
  const itemListFeatured = featured.map((tool) => ({ name: tool.name, url: absoluteUrl(`/${toolReviewPath(tool.slug)}`) }));
  const homeTitle = `${site.name} | Comparador de software para pequeños negocios`;
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
  const realLinks = tools.filter(isAffiliateReady).length;
  const rows = [...tools]
    .sort((a, b) => a.category.localeCompare(b.category) || b.score - a.score)
    .map((tool) => {
      const category = categories.find((item) => item.slug === tool.category);
      return `<tr data-status="ready" data-category="${esc(tool.category)}">
        <td><strong>${esc(tool.name)}</strong><small>${esc(category?.name ?? tool.category)}</small></td>
        <td><span class="status ready">Activo</span></td>
        <td><code>/${esc(moneyPath(tool.slug))}</code></td>
        <td><a href="${esc(toolReviewPath(tool.slug))}" target="_blank" rel="noopener">Ficha</a></td>
        <td><a href="${esc(moneyPath(tool.slug))}" target="_blank" rel="noopener">Probar /go</a></td>
        <td>${esc(tool.affiliateNetwork ?? "Directo")}</td>
        <td><a href="${esc(tool.affiliateUrl)}" target="_blank" rel="noopener sponsored">Destino</a></td>
        <td>${esc(tool.score)}/10</td>
      </tr>`;
    })
    .join("");

  const body = `<main>
    <section class="page-hero panel-hero">
      <p class="eyebrow">Panel operativo</p>
      <h1>Seguimiento de enlaces afiliados</h1>
      <p>Inventario rápido de rutas internas, fichas publicables y destinos afiliados activos. Las visitas a <code>/go/*</code> las puedes cuantificar en Cloudflare Web Analytics (u otra analítica) por ruta.</p>
    </section>
    <section class="section panel-stats">
      <article><span>${tools.length}</span><strong>Herramientas</strong></article>
      <article><span>${realLinks}</span><strong>Enlaces activos</strong></article>
      <article><span>${categories.length}</span><strong>Categorías</strong></article>
    </section>
    <section class="section panel-controls">
      <button class="filter active" data-panel-filter="all" type="button">Todo</button>
      <button class="filter" data-panel-filter="ready" type="button">Activos</button>
    </section>
    <section class="section panel-table-wrap">
      <div class="comparison-table">
        <table class="panel-table">
          <thead><tr><th>Herramienta</th><th>Estado</th><th>Ruta interna</th><th>Ficha</th><th>Test</th><th>Red</th><th>Destino</th><th>Score</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
    <section class="section editorial-note">
      <div>
        <p class="eyebrow">Medición</p>
        <h2>Cómo leer los clics</h2>
        <p>En Cloudflare Web Analytics filtra rutas que empiecen por <code>/go/</code>. Cada visita a esa URL cuenta como intención de salir hacia el proveedor.</p>
        <p>Los enlaces en el HTML llevan <code>data-affiliate</code>, <code>data-tool</code> y <code>data-cta</code> para cruzar origen del clic (tarjeta, tabla, hero de oferta, etc.) si más adelante añades etiquetas o un script propio.</p>
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
      { question: `¿Qué herramienta de ${category.name.toLowerCase()} conviene probar primero?`, answer: `Suele tener sentido empezar por ${top.name} si buscas un equilibrio razonable para «${useCase.name}». Luego compara límites del plan, precio al escalar y si puedes exportar datos.` },
      { question: "¿Hay que pagar desde el primer día?", answer: "No necesariamente. Para validar el caso, prioriza planes gratis, pruebas limitadas o pago mensual antes de cerrar un año." }
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
        <p class="eyebrow">Recomendación inicial</p>
        <h2>Empieza probando ${esc(top.name)}</h2>
        <p>${esc(top.summary)}</p>
      </div>
      ${isAffiliateReady(top)
        ? `<a class="button primary" href="../${moneyPath(top.slug)}" rel="sponsored"${affiliateDataAttrs(top, "use-case-cta")}>Ver ${esc(top.name)}</a>`
        : `<a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoría completa</a>`}
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
  const pageTitle = `${keyword}: comparativa práctica`;
  const pageDescription = `Comparativa accesible para «${keyword}»: herramientas con coste controlado y criterios de elección claros.`;
  const faqItems = [
      { question: `¿Cómo elegir si buscas «${keyword}»?`, answer: "Parte de la tarea de esta semana (una campaña, una auditoría, un envío), no del catálogo de funciones. La mejor primera prueba suele ser la que puedes configurar con datos reales en pocas horas." },
      { question: "¿Puedo combinar varias herramientas?", answer: "Sí, pero con una herramienta principal y, como mucho, una automatización sencilla al principio. Cada pieza extra sume contratos, tiempo y puntos de fallo." }
    ];
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Guía comparativa</p>
      <h1>${esc(keyword)}: opciones asequibles y fáciles de probar</h1>
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
      <a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoría completa</a>
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
  const active = matching.filter(isAffiliateReady);
  const rel = categoryPath(category.slug);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `Herramientas de ${category.name} comparadas`;
  const pageDescription = `Comparativa de herramientas de ${category.name} para ${category.audience}.`;
  const faqItems = [
      { question: `¿Qué priorizar en ${category.name}?`, answer: "Coste inicial acorde a tu caso, velocidad para probar un flujo real y límites del plan leídos con calma. Evita pagar módulos avanzados antes de tener uso medible." },
      { question: "¿Cómo medir el retorno?", answer: "Con métricas simples: clics útiles, leads válidos, horas ahorradas o piezas publicadas. Si no puedes nombrar una métrica, la compra es opinión, no decisión." }
    ];
  const itemList = matching.map((tool) => ({
    name: tool.name,
    url: absoluteUrl(`/${isAffiliateReady(tool) ? toolReviewPath(tool.slug) : alternativePath(tool.slug)}`)
  }));
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Categoría</p>
      <h1>Herramientas de ${esc(category.name)} para ${esc(category.audience)}</h1>
      <p>${esc(category.intent)}. Selección basada en coste inicial, facilidad de implantación y potencial de retorno razonable para equipos pequeños.</p>
      <p class="page-lead">Aquí filtramos por casos reales de ${esc(category.audience)}, no por el catálogo completo de funciones de cada vendor.</p>
    </section>
    <section class="section">
      <div class="tool-grid">${matching.map((tool) => toolCard(tool, categories, "..")).join("")}</div>
    </section>
    ${activeToolLinks(active, "..")}
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

function toolReviewPage(tool, category, competitors) {
  const rel = toolReviewPath(tool.slug);
  const canonical = canonicalUrlForFile(rel);
  const pageTitle = `${tool.name}: análisis, precio y cuándo probarlo`;
  const pageDescription = `${tool.name} analizado para ${category.audience}: mejor uso, ventajas, riesgos y alternativa antes de pagar.`;
  const alternatives = competitors.filter((item) => item.slug !== tool.slug).slice(0, 3);
  const faqItems = [
    { question: `¿Para quién tiene sentido ${tool.name}?`, answer: `${tool.name} encaja especialmente en ${tool.bestFor}. Antes de pagar, valida un flujo real y revisa límites del plan inicial.` },
    { question: `¿Qué riesgo conviene vigilar en ${tool.name}?`, answer: tool.cons[0] ?? "El principal riesgo es contratar más funciones de las que puedes implantar en la primera semana." }
  ];
  const rows = [
    ["Mejor uso", tool.bestFor],
    ["Precio inicial", tool.price],
    ["Ventaja principal", tool.pros[0]],
    ["Riesgo principal", tool.cons[0]],
    ["Categoría", category.name],
    ["Puntuación editorial", `${tool.score}/10`]
  ];
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Análisis de herramienta</p>
      <h1>${esc(tool.name)}: cuándo merece la pena probarlo</h1>
      <p>${esc(tool.summary)}</p>
      <p class="page-lead">Ficha pensada para ${esc(category.audience)} que quieren ${esc(category.intent)} sin empezar por una suite sobredimensionada.</p>
      <div class="hero-actions">
        <a class="button primary" href="../${moneyPath(tool.slug)}" rel="sponsored"${affiliateDataAttrs(tool, "review-hero")}>Probar ${esc(tool.name)}</a>
        <a class="button secondary" href="../${categoryPath(category.slug)}">Comparar categoría</a>
      </div>
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Decisión rápida</p>
        <h2>Úsalo si el caso está claro</h2>
        <p>La compra solo tiene sentido si puedes probar una tarea concreta en pocos días: captar un lead, publicar una campaña, auditar una web, conectar un formulario o lanzar una página. Si no puedes medir ese resultado, espera.</p>
      </div>
      <ul class="keyword-list">
        ${tool.pros.slice(0, 3).map((pro) => `<li>${esc(pro)}</li>`).join("")}
      </ul>
    </section>
    <section class="section">
      <div class="comparison-table">
        <table>
          <thead><tr><th>Criterio</th><th>${esc(tool.name)}</th></tr></thead>
          <tbody>${rows.map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
    <section class="section split">
      <div>
        <p class="eyebrow">Antes de pagar</p>
        <h2>Comprueba estos límites</h2>
        <p>${esc(tool.cons[0])}. Revisa también exportación de datos, coste al escalar y si puedes cancelar sin migración compleja.</p>
      </div>
      <ul class="keyword-list">
        <li>Configura una prueba con datos reales, no una demo vacía.</li>
        <li>Marca una métrica: clics, leads, ventas, horas ahorradas o páginas publicadas.</li>
        <li>Evita anualidades hasta confirmar uso recurrente.</li>
      </ul>
    </section>
    ${alternatives.length ? `<section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Alternativas</p>
          <h2>Si ${esc(tool.name)} no encaja</h2>
        </div>
      </div>
      <div class="tool-grid">${alternatives.map((item) => toolCard(item, [category], "..")).join("")}</div>
    </section>` : ""}
    <section class="section cta">
      <div>
        <p class="eyebrow">Siguiente paso</p>
        <h2>Probar ${esc(tool.name)} con un flujo real</h2>
        <p>Si encaja con tu caso, empieza con una prueba pequeña y mide si resuelve una tarea concreta antes de añadir más herramientas.</p>
      </div>
      <a class="button primary" href="../${moneyPath(tool.slug)}" rel="sponsored"${affiliateDataAttrs(tool, "review-cta")}>Ir a ${esc(tool.name)}</a>
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
        { name: tool.name, path: rel }
      ]),
      faqItems
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
      { question: `¿Por qué buscar alternativas a ${tool.name}?`, answer: "Suele deberse a precio, límites del plan, curva de aprendizaje, integraciones o soporte. Compara siempre contra un caso de uso concreto antes de migrar datos." },
      { question: "¿La alternativa más barata siempre compensa?", answer: "No. Compensa si cubre el mismo trabajo con mantenimiento asumible. El ahorro en licencia se pierde rápido si sumas horas internas o riesgo de errores." }
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
        : `<a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoría completa</a>`}
    </section>
    <section class="section">
      ${editorialNote("..")}
    </section>
    <section class="section">
      <p class="eyebrow">Categoría relacionada</p>
      <h2>${esc(category.name)}</h2>
      <p>${esc(category.intent)}.</p>
      <a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoría completa</a>
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
  const pageTitle = `${a.name} vs ${b.name}: comparativa rápida`;
  const pageDescription = `Comparación directa entre ${a.name} y ${b.name}: precio, caso de uso, pros, riesgos y qué tener en cuenta antes de pagar.`;
  const faqItems = [
      { question: `¿Cuándo tiene más sentido ${a.name}?`, answer: `${a.name} encaja mejor si tu prioridad es «${a.bestFor}». Revisa límites del plan y exportación antes de asumir permanencia.` },
      { question: `¿Cuándo tiene más sentido ${b.name}?`, answer: `${b.name} encaja mejor si tu prioridad es «${b.bestFor}». Pruébalo con un flujo real (mismos datos y mismo objetivo) antes de migrar.` }
    ];
  const body = `<main>
    <section class="page-hero">
      <p class="eyebrow">Comparativa</p>
      <h1>${esc(a.name)} vs ${esc(b.name)}: cuál encaja mejor</h1>
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
        <li>No elijas solo por la nota: prueba un flujo con datos reales.</li>
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
        <p class="eyebrow">Elección rápida</p>
        <h2>En la mayoría de escenarios razonables: ${esc(winner.name)}</h2>
        <p>${esc(winner.summary)}</p>
      </div>
      ${isAffiliateReady(winner)
        ? `<a class="button primary" href="../${moneyPath(winner.slug)}" rel="sponsored"${affiliateDataAttrs(winner, "comparison-cta")}>Ver ${esc(winner.name)}</a>`
        : `<a class="button secondary" href="../${categoryPath(category.slug)}">Ver categoría completa</a>`}
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
    ${fontHeadTags}
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
    ${fontHeadTags}
    <link rel="stylesheet" href="../styles.css">
  </head>
  <body>
    <main class="redirect-page">
      <h1>Redirigiendo a ${esc(tool.name)}</h1>
      <p>Este enlace puede ser de afiliado. Si no redirige solo, usa el botón.</p>
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
      ? `Esta web no instala cookies de analítica ni publicidad por defecto. Si añades medición, formularios o píxeles, documenta proveedor, finalidad y cómo darse de baja. ${contactLine}`
      : "Esta publicación puede incluir enlaces de afiliado. Si compras o te registras desde ellos, podemos recibir una comisión sin coste adicional para ti."}</p>
    <p>${isPrivacy
      ? "Los contenidos sobre herramientas se generan desde datos en este repositorio y se publican como páginas estáticas."
      : "Las recomendaciones se basan en información pública, pruebas editoriales y criterios descritos en nuestra metodología. No publicamos reseñas inventadas ni promesas de beneficios."}</p>
  </main>`;
  const rel = isPrivacy ? "privacidad.html" : "aviso-afiliados.html";
  const canonical = canonicalUrlForFile(rel);
  const title = `${isPrivacy ? "Privacidad" : "Aviso de afiliados"} | ${site.name}`;
  const description = isPrivacy ? "Política de privacidad básica de AhorroSaaS." : "Transparencia sobre enlaces de afiliado y criterios editoriales.";
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
  const publicTools = tools.filter(isAffiliateReady);
  const allTools = [...tools].sort(byMonetization);
  const publicCategories = categories.filter((category) => publicTools.some((tool) => tool.category === category.slug));
  const allCategories = categories.filter((category) => allTools.some((tool) => tool.category === category.slug));
  const offers = [...manualOffers, ...scrapedOffers].slice(0, 24);
  const paths = [];

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
  await copyFile(path.join(root, "styles.css"), path.join(dist, "styles.css"));
  await copyFile(path.join(root, "script.js"), path.join(dist, "script.js"));

  await writeHtml("index.html", homePage(publicTools, publicCategories, offers, allCategories), paths);
  await writeHtml("panel.html", panelPage(publicTools, publicCategories), paths, { indexable: false });
  await writeHtml("privacidad.html", legalPage("privacidad"), paths);
  await writeHtml("aviso-afiliados.html", legalPage("afiliados"), paths);

  for (const page of pages) {
    await writeHtml(pagePath(page.slug), resourcePage(page), paths);
  }

  for (const category of publicCategories) {
    await writeHtml(categoryPath(category.slug), categoryPage(category, publicTools, publicCategories), paths);

    for (const keyword of category.keywords) {
      await writeHtml(keywordPath(keyword), keywordPage(keyword, category, publicTools, publicCategories), paths);
    }
  }

  for (const tool of allTools) {
    const category = allCategories.find((item) => item.slug === tool.category);
    const competitors = allTools.filter((item) => item.category === tool.category && item.slug !== tool.slug).sort(byMonetization).slice(0, 3);
    await writeHtml(toolReviewPath(tool.slug), toolReviewPage(tool, category, competitors), paths);
    await writeHtml(alternativePath(tool.slug), alternativePage(tool, category, competitors), paths);
    await writeHtml(moneyPath(tool.slug), goPage(tool), paths, { indexable: false });
  }

  for (const category of allCategories) {
    const categoryTools = allTools.filter((tool) => tool.category === category.slug).sort(byMonetization);
    for (let left = 0; left < categoryTools.length - 1; left += 1) {
      for (let right = left + 1; right < categoryTools.length; right += 1) {
        const a = categoryTools[left];
        const b = categoryTools[right];
        await writeHtml(comparisonPath(a.slug, b.slug), comparisonPage(a, b, category), paths);
      }
    }
  }

  for (const useCase of useCases) {
    const category = allCategories.find((item) => item.slug === useCase.category);
    if (!category) continue;
    await writeHtml(useCasePath(category.slug, useCase.slug), useCasePage(useCase, category, allTools, allCategories), paths);
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
