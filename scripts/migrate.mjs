// One-time migration script: converts the legacy hand-written HTML pages
// (root pages, quienes-somos/, noticias/) into Eleventy source files under src/.
// Run once via `npm run migrate`, review the output, then the old top-level
// HTML files are removed in the same commit.

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import matter from "gray-matter";

const ROOT = process.cwd();

const ROOT_PAGES = ["index.html", "contacto.html", "eventos.html", "hazte-miembro.html", "proyectos.html"];
const QUIENES_SOMOS_PAGES = [
  "mision.html", "equipo.html", "miembros.html", "actas.html",
  "estatutos.html", "equipamiento.html", "proteccion-datos.html",
];

// Confirmed by reading noticias/index.html: these 16 posts are in English,
// even though every source file has <html lang="es"> hardcoded regardless
// of actual content language. Filenames alone are not a reliable signal
// (e.g. 1606-engineering-day-afterwork.html is Spanish, 1610- is English),
// so this list was built by reading each post's actual excerpt/body text.
const ENGLISH_POSTS = new Set([
  "1610-engineering-day-afterwork",
  "1593-hardware-design-contest",
  "1334-a-n-not-so-epic-tale-of-electronic-design",
  "1199-medialab-prado-citizen-collaboration-and-development",
  "1099-create-the-most-absurd-chat-of-the-world-with-arduino",
  "996-robotics-workshop-2016",
  "637-lightwand-kosmonaut-v1-lightpainting-with-arduino-taken-a-st",
  "608-configure-stm32f3-for-tau-labs-flying-f3",
  "539-the-apprentice-engineer-ii-engineering-fair",
  "465-do-you-want-to-use-your-nokia-screen-with-tiva-c-series",
  "514-aetels-gamer-meeting",
  "512-eagle-workshop-2015",
  "509-fab-lab-upm-guided-visit",
  "505-raspberry-pi-wifi-remotely-controlled-vehicle",
  "503-hybrid-mugen-audio-amplifier",
  "473-sumobot-initiation-workshop",
]);

function rewriteUrl(value, dirContext) {
  if (!value) return value;
  if (/^([a-z]+:)?\/\//i.test(value) || value.startsWith("mailto:") || value.startsWith("#") || value.startsWith("/")) {
    return value;
  }
  if (value.startsWith("../")) {
    return "/" + value.slice(3);
  }
  if (dirContext === "root") return "/" + value;
  if (dirContext === "quienes-somos") return "/quienes-somos/" + value;
  if (dirContext === "noticias") return "/noticias/" + value;
  return value;
}

function rewriteLinksIn($, root, dirContext) {
  root.find("[href]").each((_, el) => {
    const $el = $(el);
    $el.attr("href", rewriteUrl($el.attr("href"), dirContext));
  });
  root.find("[src]").each((_, el) => {
    const $el = $(el);
    $el.attr("src", rewriteUrl($el.attr("src"), dirContext));
  });
}

function buildDateMap() {
  const html = fs.readFileSync(path.join(ROOT, "noticias/index.html"), "utf8");
  const $ = cheerio.load(html);
  const map = new Map();
  $(".post-list li").each((_, li) => {
    const href = $(li).find("a").attr("href");
    const iso = $(li).find("time").attr("datetime");
    if (href && iso) {
      map.set(href.replace(/\.html$/, ""), iso);
    }
  });
  return map;
}

function migratePlainPage(filename, srcHtmlPath, outDir, dirContext) {
  const html = fs.readFileSync(srcHtmlPath, "utf8");
  const $ = cheerio.load(html);
  const title = $("title").text().trim();
  const description = ($('meta[name="description"]').attr("content") || "").trim();
  const main = $("main");
  rewriteLinksIn($, main, dirContext);
  const body = main.html().trim();

  const out = matter.stringify(body, { layout: "base.njk", title, description, lang: "es" });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, filename.replace(/\.html$/, ".njk")), out);
  return body;
}

function migratePost(filename, dateMap) {
  const srcPath = path.join(ROOT, "noticias", filename);
  const html = fs.readFileSync(srcPath, "utf8");
  const $ = cheerio.load(html);
  const slug = filename.replace(/\.html$/, "");

  const title = $("h1").first().text().trim();
  const description = ($('meta[name="description"]').attr("content") || "").trim();

  const postMetaText = $(".post-meta").first().text();
  const author = postMetaText.split("·").pop().trim();

  const date = dateMap.get(slug);
  if (!date) throw new Error(`No date found for ${slug} in noticias/index.html`);

  const lang = ENGLISH_POSTS.has(slug) ? "en" : "es";

  const langLink = $(".lang-links a").attr("href");
  const translation = langLink ? langLink.replace(/^\.\//, "").replace(/\.html$/, "") : undefined;

  const postBody = $(".post-body").clone();
  postBody.find(".lang-links").remove();
  rewriteLinksIn($, postBody, "noticias");
  const body = postBody.html().trim();

  const data = { layout: "post.njk", title, description, date, author, lang };
  if (translation) data.translation = translation;

  const out = matter.stringify(body, data);
  const outDir = path.join(ROOT, "src/noticias");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${slug}.md`), out);
  return { slug, translation, body };
}

function main() {
  const dateMap = buildDateMap();

  console.log("Migrating root pages...");
  for (const file of ROOT_PAGES) {
    migratePlainPage(file, path.join(ROOT, file), path.join(ROOT, "src"), "root");
  }

  console.log("Migrating quienes-somos pages...");
  const actasBody = {};
  for (const file of QUIENES_SOMOS_PAGES) {
    const body = migratePlainPage(
      file,
      path.join(ROOT, "quienes-somos", file),
      path.join(ROOT, "src/quienes-somos"),
      "quienes-somos"
    );
    if (file === "actas.html") actasBody.text = body;
  }
  if (!actasBody.text.includes("TODO")) {
    throw new Error("actas.html migration lost the TODO notice about dead Google Doc/Drive links");
  }

  console.log("Migrating noticias posts...");
  const postFiles = fs.readdirSync(path.join(ROOT, "noticias")).filter((f) => f.endsWith(".html") && f !== "index.html");
  const results = postFiles.map((f) => migratePost(f, dateMap));

  console.log("Checking translation symmetry...");
  const bySlug = new Map(results.map((r) => [r.slug, r]));
  for (const r of results) {
    if (!r.translation) continue;
    const target = bySlug.get(r.translation);
    if (!target) throw new Error(`${r.slug} points to translation "${r.translation}" which does not exist`);
    if (target.translation !== r.slug) {
      throw new Error(`Asymmetric translation pairing: ${r.slug} -> ${r.translation}, but ${r.translation} -> ${target.translation}`);
    }
  }

  console.log(`Done. Migrated ${ROOT_PAGES.length} root pages, ${QUIENES_SOMOS_PAGES.length} quienes-somos pages, ${results.length} noticias posts.`);
}

main();
