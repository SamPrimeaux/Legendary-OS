#!/usr/bin/env node
// los: validate | live-capture | import-live | parity | build-demo | serve | seed-sql | deployment-check | schema-diff | db-lock
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { validateManifest, validateDeployment, validateBrand, validateTokens } from "../packages/site-contracts/src/index.ts";
import { createRegistry, validateBundle } from "../packages/cms-core/src/index.ts";
import { renderPage, esc, mountPrefix } from "../packages/site-renderer/src/index.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = resolve(ROOT, ".."); // the live system lives here; platform never writes to it
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + "\n"); };
const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : dflt; };
const flag = (name) => process.argv.includes(`--${name}`);
const appIds = () => readdirSync(join(ROOT, "apps")).filter((d) => statSync(join(ROOT, "apps", d)).isDirectory()).sort();
const fail = (msg) => { console.error(msg); process.exit(1); };

// ---------- loading ----------
function legacyMediaCount(bundle, brand) {
  let n = brand?.logo && /^(\/|https?:)/.test(brand.logo.key) ? 1 : 0;
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if (["mediaKey", "beforeKey", "afterKey"].includes(k) && typeof x === "string" && /^(\/|https?:)/.test(x)) n++;
      else walk(x);
    }
  };
  walk(bundle.pages); walk(bundle.collections);
  return n;
}

function loadApp(id) {
  const dir = join(ROOT, "apps", id);
  const manifest = readJson(join(dir, "app.manifest.json"));
  const errors = validateManifest(manifest);
  if (errors.length) return { id, dir, errors, warnings: [] };
  const brand = readJson(join(dir, manifest.brand));
  const tokens = readJson(join(dir, manifest.theme.tokens));
  const bundle = readJson(join(dir, manifest.content.seed));
  errors.push(...validateBrand(brand), ...validateTokens(tokens), ...validateBundle(bundle, createRegistry()));
  const warnings = [];
  const legacy = legacyMediaCount(bundle, brand);
  if (legacy) warnings.push(`${legacy} media reference(s) still point at legacy URLs; migrate them to media keys when the media library is converged`);
  return { id, dir, manifest, brand, tokens, bundle, errors, warnings };
}

function loadDeployment(id) {
  const dir = join(ROOT, "deployments", id);
  const dep = readJson(join(dir, "deployment.json"));
  const errors = validateDeployment(dep, appIds());
  const apps = errors.length ? [] : dep.sites.map((s) => ({ ...loadApp(s.app), basePath: s.basePath }));
  return { id, dir, dep, errors, apps };
}
function mustLoadDeployment() {
  const d = loadDeployment(arg("deployment"));
  const errs = [...d.errors, ...d.apps.flatMap((a) => a.errors.map((e) => `${a.id}: ${e}`))];
  if (errs.length) fail("INVALID\n - " + errs.join("\n - "));
  return d;
}

const mediaFor = (dep) => (key) => (!key ? null : key.startsWith("/") ? (dep.previewMediaBase ?? "") + key : /^https?:/.test(key) ? key : null);
const ctxFor = (app, dep, page) => ({ brand: app.brand, tokens: app.tokens, globals: app.bundle.globals, collections: app.bundle.collections, media: mediaFor(dep), route: page.route, siteKey: app.manifest.site.key, basePath: app.basePath });
const slug = (route) => route.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home";
const fixturePath = (siteKey, liveRoute) => join(ROOT, "fixtures/live-demo", `${siteKey}__${slug(liveRoute)}.json`);

// ---------- JSONC (for reading the live wrangler config) ----------
function stripJsonc(src) {
  let out = "", i = 0, inStr = false;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (inStr) { out += c; if (c === "\\") { out += n ?? ""; i += 2; continue; } if (c === '"') inStr = false; i++; continue; }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && n === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
    out += c; i++;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

// ---------- live import helpers ----------
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)));
const pageKey = (route) => (route === "/" ? "home" : route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase());

function convertSection(s, map, report) {
  const d = s.data ?? {};
  const L = (label, href) => (label && href ? { label, href: map(href) } : undefined);
  const known = {
    hero: ["eyebrow", "heading", "body", "image", "imageAlt", "proof", "ctaLabel", "ctaHref", "secondaryLabel", "secondaryHref"],
    intro: ["eyebrow", "heading", "body", "points"], content: ["eyebrow", "heading", "body", "points"],
    services: ["eyebrow", "heading", "body", "items"], gallery: ["eyebrow", "heading", "body", "items", "ctaLabel", "ctaHref"],
    process: ["eyebrow", "heading", "body", "items"], listings: ["eyebrow", "heading", "body", "items", "ctaLabel", "ctaHref"],
    cta: ["eyebrow", "heading", "body", "ctaLabel", "ctaHref", "secondaryLabel", "secondaryHref"],
  };
  if (!known[s.type]) throw new Error(`unsupported live section type "${s.type}" (${s.id}); extend the registry before importing`);
  const unmapped = Object.keys(d).filter((k) => !known[s.type].includes(k));
  let type, data;
  switch (s.type) {
    case "hero": type = "hero"; data = clean({ eyebrow: d.eyebrow, heading: d.heading, body: d.body, mediaKey: d.image, alt: d.imageAlt, proof: d.proof, primaryCta: L(d.ctaLabel, d.ctaHref), secondaryCta: L(d.secondaryLabel, d.secondaryHref) }); break;
    case "intro": case "content": type = "text-split"; data = clean({ eyebrow: d.eyebrow, heading: d.heading, body: d.body, points: d.points }); break;
    case "services": type = "card-grid"; data = clean({ eyebrow: d.eyebrow, heading: d.heading, intro: d.body, layout: "cards", columns: (d.items ?? []).length === 2 ? "2" : "3", items: (d.items ?? []).map((i) => clean({ title: i.title, body: i.body, href: i.href ? map(i.href) : undefined })) }); break;
    case "gallery": type = "card-grid"; data = clean({ eyebrow: d.eyebrow, heading: d.heading, intro: d.body, layout: "cards", columns: "3", items: (d.items ?? []).map((i) => clean({ title: i.title, meta: i.meta, mediaKey: i.image, alt: i.alt })), cta: L(d.ctaLabel, d.ctaHref) }); break;
    case "process": type = "card-grid"; data = clean({ eyebrow: d.eyebrow, heading: d.heading, intro: d.body, layout: "steps", columns: "3", items: (d.items ?? []).map((i) => clean({ title: i.title, body: i.body })) }); break;
    case "listings": type = "card-grid"; data = clean({ eyebrow: d.eyebrow, heading: d.heading, intro: d.body, layout: "listings", columns: "3", items: (d.items ?? []).map((i) => clean({ title: i.title, meta: i.location, body: i.details, badge: i.status, mediaKey: i.image, alt: i.title })), cta: L(d.ctaLabel, d.ctaHref) }); break;
    case "cta": type = "cta-banner"; data = clean({ eyebrow: d.eyebrow, heading: d.heading, body: d.body, cta: L(d.ctaLabel, d.ctaHref), secondary: L(d.secondaryLabel, d.secondaryHref) }); break;
  }
  data._legacy = clean({ id: s.id, type: s.type, name: s.name, unmapped: unmapped.length ? Object.fromEntries(unmapped.map((k) => [k, d[k]])) : undefined });
  if (unmapped.length) report.unmapped.push(`${s.id}: ${unmapped.join(", ")}`);
  return { type, data };
}

function importSite(app, dep, report) {
  const siteKey = app.manifest.site.key;
  const routes = dep.dep.parity.sites[app.id].routes;
  const prefix = mountPrefix(app.basePath);
  const fx = Object.entries(routes).map(([liveRoute, canon]) => ({ liveRoute, canon, data: readJson(fixturePath(siteKey, liveRoute)) }));
  const home = (fx.find((f) => f.canon === "/") ?? fx[0]).data;
  const nav = home.globalCmsNav;
  const map = (href) => {
    if (!href) return href;
    if (/^(tel:|mailto:|https?:)/i.test(href)) { if (/^https?:/i.test(href)) report.externalLinks.add(href); return href; }
    if (href === "#contact") { report.rewrites.push("#contact -> /contact"); return "/contact"; }
    if (href.startsWith("#")) return href;
    let p = href;
    if (prefix && (p === prefix || p.startsWith(prefix + "/"))) p = p.slice(prefix.length) || "/";
    const out = routes[p] ?? p;
    if (out !== href) report.rewrites.push(`${href} -> ${out}`);
    return out;
  };

  const t = home.theme?.tokens ?? {};
  const brandHex = t.brand ?? "#111111", surface = t.surface ?? "#f4f1ea";
  const tokens = { canvas: surface, paper: "#ffffff", muted: "#e8e3d8", ink: brandHex, "ink-soft": "#5c5c5c", accent: brandHex, "accent-ink": "#ffffff", inverse: brandHex, "inverse-ink": surface, "font-display": "Georgia, 'Times New Roman', serif", "font-body": "system-ui, -apple-system, 'Segoe UI', sans-serif", radius: `${t.radius ?? 12}px` };

  const brand = clean({
    name: home.site.name, mark: nav.brand?.mark, sublabel: nav.brand?.sublabel,
    logo: nav.brand?.logoUrl ? { key: nav.brand.logoUrl, alt: nav.brand.logoAlt ?? home.site.name } : undefined,
    contact: clean({ phone: nav.footer?.phone, phoneHref: nav.footer?.phoneHref, serviceArea: nav.footer?.location }),
    legal: { copyright: `© ${home.site.name}` },
    seo: clean({ titleSuffix: "", defaultDescription: home.page.seo?.description }),
  });

  const globals = clean({
    header: clean({
      links: nav.header.links.map((l) => ({ label: l.label, href: map(l.href) })),
      utility: (nav.header.utilityLinks ?? []).map((l) => ({ label: l.label, href: l.href, root: true })),
      cta: nav.header.cta ? { label: nav.header.cta.label, href: map(nav.header.cta.href) } : undefined,
    }),
    footer: clean({ links: (nav.footer?.links ?? []).map((l) => ({ label: l.label, href: map(l.href) })), note: nav.footer?.note }),
  });

  const pages = fx.map((f) => {
    const p = f.data.page;
    let flip = false;
    const sections = f.data.sections.map((s) => {
      const c = convertSection(s, map, report);
      const key = `${c.type === "text-split" ? s.type : s.type}`;
      const settings = s.type === "hero" ? undefined : s.type === "cta" ? { surface: "inverse" } : { surface: (flip = !flip) ? "canvas" : "paper" };
      return clean({ key, type: c.type, settings, data: c.data });
    });
    return clean({
      key: pageKey(f.canon), route: f.canon, aliases: f.liveRoute !== f.canon ? [f.liveRoute] : undefined,
      title: p.title, description: p.seo?.description, seo: clean({ title: p.seo?.title, description: p.seo?.description }), template: p.pageType, sections,
    });
  });
  return { brand, tokens, bundle: { schemaVersion: 1, globals, pages, collections: {} } };
}

// ---------- parity ----------
const SKIP_KEYS = new Set(["image", "imageAlt", "alt", "href", "ctaHref", "secondaryHref"]);
function leafStrings(v, key = "", out = []) {
  if (typeof v === "string") { if (!SKIP_KEYS.has(key) && v.trim()) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => leafStrings(x, key, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) leafStrings(x, k, out);
  return out;
}

// ---------- seed ----------
function seedStatements(app, update) {
  const site = app.manifest.site.key;
  const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const j = (v) => q(JSON.stringify(v));
  const upsert = (table, cols, vals, conflict, setCols) =>
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT(${conflict}) ` + (update && setCols.length ? `DO UPDATE SET ${setCols.map((c) => `${c} = excluded.${c}`).join(", ")};` : "DO NOTHING;");
  const sql = [`-- ${site} (${update ? "upsert" : "insert-only"})`];
  const publish = (scope, key, snap) => {
    const id = `seed-${scope}-${key}-${createHash("sha256").update(JSON.stringify(snap)).digest("hex").slice(0, 10)}`;
    sql.push(`INSERT OR IGNORE INTO revisions (id, site_key, scope, scope_key, kind, snapshot_json, actor) VALUES (${q(id)}, ${q(site)}, ${q(scope)}, ${q(key)}, 'publish', ${j(snap)}, 'seed');`);
    sql.push(upsert("publications", ["site_key", "scope", "scope_key", "revision_id", "snapshot_json"], [q(site), q(scope), q(key), q(id), j(snap)], "site_key, scope, scope_key", ["revision_id", "snapshot_json"]));
  };
  sql.push(upsert("sites", ["key", "name", "domain", "theme_json", "brand_json"], [q(site), q(app.brand.name), "NULL", j(app.tokens), j(app.brand)], "key", ["name", "theme_json", "brand_json"]));
  sql.push(upsert("globals", ["site_key", "data_json"], [q(site), j(app.bundle.globals)], "site_key", ["data_json"]));
  publish("globals", "site", app.bundle.globals);
  app.bundle.pages.forEach((p, i) => {
    sql.push(upsert("pages", ["site_key", "key", "route", "title", "description", "template", "status", "sort_order"], [q(site), q(p.key), q(p.route), q(p.title), q(p.description ?? null), q(p.template ?? null), "'published'", String(i)], "site_key, key", ["route", "title", "description", "template", "status", "sort_order"]));
    for (const a of p.aliases ?? []) sql.push(upsert("page_aliases", ["site_key", "alias", "page_key"], [q(site), q(a), q(p.key)], "site_key, alias", ["page_key"]));
    p.sections.forEach((s, n) => sql.push(upsert("sections", ["site_key", "page_key", "key", "type", "preset", "settings_json", "data_json", "blocks_json", "visible", "sort_order"], [q(site), q(p.key), q(s.key), q(s.type), q(s.preset ?? null), j(s.settings ?? {}), j(s.data), j(s.blocks ?? []), s.visible === false ? "0" : "1", String(n)], "site_key, page_key, key", ["type", "preset", "settings_json", "data_json", "blocks_json", "visible", "sort_order"])));
    publish("page", p.key, p);
  });
  for (const [name, items] of Object.entries(app.bundle.collections)) {
    items.forEach((it, n) => sql.push(upsert("collection_items", ["site_key", "collection", "slug", "title", "status", "sort_order", "data_json", "published_at"], [q(site), q(name), q(it.slug), q(it.title), "'published'", String(it.sortOrder ?? n), j(it.data), "datetime('now')"], "site_key, collection, slug", ["title", "status", "sort_order", "data_json"])));
    publish("collection", name, items.map((it, n) => ({ ...it, status: "published", sortOrder: it.sortOrder ?? n })));
  }
  return sql;
}

const commands = {
  list() { appIds().forEach((id) => console.log(id)); },

  validate() {
    let bad = 0;
    for (const id of appIds()) {
      const app = loadApp(id);
      if (app.errors.length) { bad++; console.error(`${id}: INVALID\n - ` + app.errors.join("\n - ")); continue; }
      console.log(`${id}: OK (${app.bundle.pages.length} pages, ${Object.keys(app.bundle.collections).length} collections, ${(app.bundle.globals.overlays ?? []).length} overlays)`);
      app.warnings.forEach((w) => console.log(`  warn: ${w}`));
    }
    const depDir = join(ROOT, "deployments");
    for (const id of existsSync(depDir) ? readdirSync(depDir).filter((d) => existsSync(join(depDir, d, "deployment.json"))) : []) {
      const errs = validateDeployment(readJson(join(depDir, id, "deployment.json")), appIds());
      if (errs.length) { bad++; console.error(`deployment ${id}: INVALID\n - ` + errs.join("\n - ")); } else console.log(`deployment ${id}: OK`);
    }
    if (bad) process.exit(1);
  },

  async "live-capture"() {
    const d = loadDeployment(arg("deployment"));
    if (d.errors.length) fail(d.errors.join("\n"));
    const base = d.dep.parity.liveBase;
    const entries = [];
    for (const app of d.apps) {
      for (const liveRoute of Object.keys(d.dep.parity.sites[app.id].routes)) {
        const siteKey = app.manifest.site.key;
        const url = `${base}/api/public/sites/${encodeURIComponent(siteKey)}/page?route=${encodeURIComponent(liveRoute)}`;
        const res = await fetch(url, { headers: { "user-agent": "platform-parity/1" } }); // read-only GET of a public endpoint
        const body = await res.text();
        if (!res.ok) fail(`${siteKey} ${liveRoute}: HTTP ${res.status}`);
        const file = fixturePath(siteKey, liveRoute);
        writeJson(file, JSON.parse(body));
        entries.push({ siteKey, route: liveRoute, file: file.replace(ROOT + "/", ""), bytes: body.length, sha256: createHash("sha256").update(body).digest("hex") });
        console.log(`captured ${siteKey} ${liveRoute} (${body.length} bytes)`);
      }
    }
    writeJson(join(ROOT, "fixtures/live-demo/manifest.json"), { capturedAt: new Date().toISOString(), base, entries });
  },

  "import-live"() {
    const d = mustLoadDeployment();
    for (const app of d.apps) {
      const out = { content: join(app.dir, "content/site.json"), brand: join(app.dir, "brand/brand.json"), tokens: join(app.dir, "brand/tokens.json") };
      if (!flag("force") && existsSync(out.content)) fail(`${app.id}: content/site.json exists. import-live is a one-time bridge; re-running overwrites hand edits. Pass --force to overwrite.`);
      const report = { rewrites: [], unmapped: [], externalLinks: new Set() };
      const r = importSite(app, d, report);
      writeJson(out.content, r.bundle); writeJson(out.brand, r.brand); writeJson(out.tokens, r.tokens);
      writeJson(join(d.dir, "reports", `import-${app.id}.json`), { app: app.id, importedAt: new Date().toISOString(), pages: r.bundle.pages.length, sections: r.bundle.pages.reduce((n, p) => n + p.sections.length, 0), linkRewrites: [...new Set(report.rewrites)], externalLinksKept: [...report.externalLinks], unmappedFields: report.unmapped });
      console.log(`${app.id}: imported ${r.bundle.pages.length} pages; ${new Set(report.rewrites).size} link rewrite(s); ${report.unmapped.length} section(s) with unmapped fields`);
    }
  },

  parity() {
    const d = mustLoadDeployment();
    let problems = 0, strings = 0, pages = 0;
    for (const app of d.apps) {
      for (const [liveRoute, canon] of Object.entries(d.dep.parity.sites[app.id].routes)) {
        const live = readJson(fixturePath(app.manifest.site.key, liveRoute));
        const page = app.bundle.pages.find((p) => p.route === canon);
        const miss = [];
        if (!page) { console.error(`  ${app.id} ${liveRoute}: no platform page for ${canon}`); problems++; continue; }
        if (liveRoute !== canon && !(page.aliases ?? []).includes(liveRoute)) miss.push(`legacy URL ${liveRoute} is not an alias`);
        if (live.sections.length !== page.sections.length) miss.push(`section count ${live.sections.length} -> ${page.sections.length}`);
        const html = renderPage(page, ctxFor(app, d.dep, page));
        const must = [...live.sections.flatMap((s) => leafStrings(s.data)), live.page.seo?.title, ...(live.globalCmsNav?.header?.links ?? []).map((l) => l.label), live.globalCmsNav?.header?.cta?.label, live.globalCmsNav?.footer?.phone, live.globalCmsNav?.footer?.location].filter(Boolean);
        for (const v of must) { strings++; if (!html.includes(esc(v))) miss.push(`missing text: ${String(v).slice(0, 70)}`); }
        pages++;
        if (miss.length) { problems += miss.length; console.error(`  ${app.id} ${liveRoute} -> ${canon}\n    - ` + miss.slice(0, 6).join("\n    - ") + (miss.length > 6 ? `\n    ... +${miss.length - 6} more` : "")); }
      }
    }
    console.log(`parity: ${pages} live pages, ${strings} text checks, ${problems} problem(s)`);
    if (problems) process.exit(1);
  },

  "build-demo"() {
    const d = mustLoadDeployment();
    const out = join(d.dir, "dist");
    rmSync(out, { recursive: true, force: true });
    const built = new Set();
    const files = [];
    const put = (urlPath, html) => {
      const file = urlPath === "/" ? join(out, "index.html") : join(out, urlPath, "index.html");
      mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, html);
      built.add(urlPath); files.push(file);
    };
    for (const app of d.apps) {
      const prefix = mountPrefix(app.basePath);
      for (const page of app.bundle.pages) {
        put(prefix + page.route === "" ? "/" : prefix + (page.route === "/" ? "" : page.route) || "/", renderPage(page, ctxFor(app, d.dep, page)));
        for (const a of page.aliases ?? []) put(prefix + a, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${prefix + page.route}"><link rel="canonical" href="${prefix + page.route}">`);
      }
    }
    // internal link check: every site link must land on a built page
    const skip = ["/dashboard", "/api/", "/auth/", "/assets/", "/media/"];
    const broken = new Set();
    for (const f of files) {
      const html = readFileSync(f, "utf8");
      for (const m of html.matchAll(/href="([^"]+)"/g)) {
        const href = m[1].replace(/&amp;/g, "&");
        if (!href.startsWith("/") || href.startsWith("//") || skip.some((s) => href.startsWith(s))) continue;
        const p = href.split(/[#?]/)[0].replace(/\/+$/, "") || "/";
        if (!built.has(p)) broken.add(`${f.replace(out, "")} -> ${href}`);
      }
    }
    writeFileSync(join(out, "seed.sql"), d.apps.flatMap((a) => seedStatements(a, flag("update"))).join("\n") + "\n");
    console.log(`demo: ${files.length} pages built -> ${out}`);
    if (broken.size) fail("broken internal links:\n - " + [...broken].join("\n - "));
    console.log("link check: every internal link resolves");
  },

  "seed-sql"() {
    const d = mustLoadDeployment();
    const update = flag("update");
    const sql = d.apps.flatMap((a) => seedStatements(a, update));
    const out = resolve(arg("out", join(d.dir, "dist/seed.sql")));
    mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, sql.join("\n") + "\n");
    console.log(`${d.id}: ${sql.length} statements for ${d.apps.length} sites -> ${out} (${update ? "upsert" : "insert-only"}). Fresh installs only; never run against the legacy database.`);
  },

  serve() {
    const d = mustLoadDeployment();
    const out = resolve(join(d.dir, "dist"));
    if (!existsSync(out)) fail("nothing built yet. run: npm run build:demo");
    const port = Number(arg("port", "4390"));
    const types = { ".html": "text/html; charset=utf-8", ".sql": "text/plain" };
    http.createServer((req, res) => {
      const p = decodeURIComponent((req.url ?? "/").split("?")[0]);
      if (p.includes("..")) { res.writeHead(400); return res.end(); }
      let file = join(out, p);
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!existsSync(file)) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
      res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }); res.end(readFileSync(file));
    }).listen(port, "127.0.0.1", () => console.log(`${d.id} preview: ` + d.dep.sites.map((s) => `http://127.0.0.1:${port}${mountPrefix(s.basePath) || "/"}`).join("  ")));
  },

  // The platform never deploys yet. This keeps its description of the live deployment honest.
  "deployment-check"() {
    const d = loadDeployment(arg("deployment"));
    if (d.errors.length) fail(d.errors.join("\n"));
    const wr = join(REPO, "wrangler.jsonc");
    if (!existsSync(wr)) { console.log("deployment-check: no ../wrangler.jsonc (standalone checkout); skipped"); return; }
    const live = JSON.parse(stripJsonc(readFileSync(wr, "utf8")));
    const cf = d.dep.cloudflare;
    const checks = [["worker", cf.worker, live.name], ["d1", cf.d1, live.d1_databases?.[0]?.database_name], ["r2", cf.r2, live.r2_buckets?.[0]?.bucket_name]];
    const drift = checks.filter(([, a, b]) => a !== b).map(([k, a, b]) => `${k}: platform says "${a}", live wrangler.jsonc says "${b}"`);
    if (drift.length) fail("deployment drift:\n - " + drift.join("\n - "));
    console.log("deployment-check: platform deployment matches live wrangler.jsonc (worker, d1, r2 names)");
  },

  "schema-diff"() {
    const tables = (dir) => new Set(existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".sql")).flatMap((f) => [...readFileSync(join(dir, f), "utf8").matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z_0-9]+)/gi)].map((m) => m[1])) : []);
    const live = tables(join(REPO, "migrations")), plat = tables(join(ROOT, "packages/platform-db/migrations"));
    const both = [...plat].filter((t) => live.has(t));
    console.log(`live tables (${live.size}), platform baseline tables (${plat.size})`);
    console.log(both.length ? `COLLISIONS (same name, must never share a database until converged): ${both.join(", ")}` : "no name collisions");
    console.log("only in live:", [...live].filter((t) => !plat.has(t)).join(", "));
    console.log("only in platform:", [...plat].filter((t) => !live.has(t)).join(", "));
  },

  "db-lock"() {
    const dir = join(ROOT, "packages/platform-db/migrations");
    const lock = {};
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) lock[f] = createHash("sha256").update(readFileSync(join(dir, f), "utf8")).digest("hex");
    writeJson(join(ROOT, "packages/platform-db/migrations.lock.json"), lock);
    console.log("migrations.lock.json updated:", Object.keys(lock).join(", "));
  },
};

const cmd = process.argv[2];
if (!cmd || !commands[cmd]) { console.log("usage: los <" + Object.keys(commands).join(" | ") + "> [--deployment id]"); process.exit(cmd ? 1 : 0); }
await commands[cmd]();
