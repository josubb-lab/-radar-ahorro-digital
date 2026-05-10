import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const outFile = path.join(dataDir, "offers.scraped.json");
const userAgent = "RadarAhorroDigitalBot/0.1 (+static affiliate research; contact: tucorreo@example.com)";

const readJson = async (file) => JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
const textBetween = (value, tag) => {
  const match = value.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim()) : "";
};
const decodeXml = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", "\"")
  .replaceAll("&#39;", "'");

function normalizeUrl(value) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`URL invalida en sources.json: ${value}`);
  }
}

async function robotsAllows(sourceUrl) {
  const url = normalizeUrl(sourceUrl);
  const robotsUrl = `${url.origin}/robots.txt`;

  try {
    const response = await fetch(robotsUrl, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return true;

    const body = await response.text();
    const lines = body.split(/\r?\n/).map((line) => line.trim());
    let applies = false;

    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const [rawKey, ...rawValue] = line.split(":");
      const key = rawKey.toLowerCase();
      const value = rawValue.join(":").trim();

      if (key === "user-agent") applies = value === "*" || userAgent.toLowerCase().startsWith(value.toLowerCase());
      if (applies && key === "disallow" && value && url.pathname.startsWith(value)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

function parseRss(xml, source) {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].slice(0, 12);
  return items.map(([item]) => {
    const title = textBetween(item, "title");
    const link = textBetween(item, "link");
    return {
      tool: source.tool,
      label: title.slice(0, 120),
      urgency: `Detectado en ${source.name}`,
      source: source.name,
      sourceUrl: link || source.url,
      category: source.category,
      scrapedAt: new Date().toISOString()
    };
  }).filter((offer) => offer.label);
}

async function scrapeSource(source) {
  if (!source.enabled) return [];
  if (source.type !== "rss") throw new Error(`Tipo de fuente no soportado: ${source.type}`);
  if (!await robotsAllows(source.url)) throw new Error(`robots.txt no permite acceder a ${source.url}`);

  const response = await fetch(source.url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${source.url} respondio ${response.status}`);
  const body = await response.text();
  return parseRss(body, source);
}

async function main() {
  const sources = await readJson("sources.json");
  const enabled = sources.filter((source) => source.enabled);

  if (enabled.length === 0) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(outFile, "[]\n", "utf8");
    console.log("No hay fuentes habilitadas. Edita data/sources.json y vuelve a ejecutar npm run scrape.");
    return;
  }

  const results = [];
  for (const source of enabled) {
    const offers = await scrapeSource(source);
    results.push(...offers);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  await writeFile(outFile, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(`Scraped ${results.length} offers into data/offers.scraped.json`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
