import type { AppManifest, BrandPack, CollectionItem, Globals, Page, ThemeTokens } from "@inneranimalmedia/site-contracts";
import { collectionRefs, mountPrefix, renderPage } from "@inneranimalmedia/site-renderer";
import { API, err, ok } from "@inneranimalmedia/platform-protocol";

// Minimal structural types so this package needs no Cloudflare typings.
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Like { prepare(sql: string): D1Statement }
export interface R2Like { get(key: string): Promise<{ body: ReadableStream } | null> }
export interface Env { DB: D1Like; MEDIA: R2Like }

/** One site mounted at a path. A deployment mounts one or many. */
export interface SiteMount { manifest: AppManifest; brand: BrandPack; tokens: ThemeTokens; basePath: string }
export interface PlatformWorkerOptions { sites: SiteMount[] }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

/** The public site reads published snapshots only: one primary-key lookup each. */
async function snapshot<T>(env: Env, site: string, scope: string, key: string): Promise<T | null> {
  const row = await env.DB
    .prepare("SELECT snapshot_json FROM publications WHERE site_key = ? AND scope = ? AND scope_key = ?")
    .bind(site, scope, key)
    .first<{ snapshot_json: string }>();
  return row ? (JSON.parse(row.snapshot_json) as T) : null;
}

/** Longest mount prefix wins. Returns the mount and the site-relative path. */
export function resolveMount(sites: SiteMount[], pathname: string): { mount: SiteMount; local: string } | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  const ordered = [...sites].sort((a, b) => mountPrefix(b.basePath).length - mountPrefix(a.basePath).length);
  for (const mount of ordered) {
    const prefix = mountPrefix(mount.basePath);
    if (prefix === "") return { mount, local: path };
    if (path === prefix) return { mount, local: "/" };
    if (path.startsWith(prefix + "/")) return { mount, local: path.slice(prefix.length) };
  }
  return null;
}

async function handleLead(req: Request, env: Env, sites: SiteMount[]): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return json(err("bad_request", "Invalid JSON"), 400); }
  if (typeof body.company_website === "string" && body.company_website !== "") return json(ok({ id: "ok" })); // honeypot
  const mount = sites.find((s) => s.manifest.site.key === body.site);
  if (!mount) return json(err("unknown_site", "Unknown site"), 422);
  const text = (k: string, max = 2000) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = text("name", 200), email = text("email", 320), phone = text("phone", 40);
  if (!name || (!email && !phone)) return json(err("invalid_lead", "Name and an email or phone are required"), 422);
  const known = new Set(["site", "kind", "name", "email", "phone", "message", "sourceRoute", "company_website"]);
  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) if (!known.has(k) && typeof v === "string") extra[k] = v.slice(0, 1000);
  const id = crypto.randomUUID();
  await env.DB
    .prepare("INSERT INTO leads (id, site_key, kind, name, email, phone, message, data_json, source_route) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, mount.manifest.site.key, text("kind", 40) || "contact", name, email || null, phone || null, text("message") || null, JSON.stringify(extra), text("sourceRoute", 200) || null)
    .run();
  return json(ok({ id }), 201);
}

/** /media/<siteKey>/<key...> */
async function handleMedia(env: Env, rest: string): Promise<Response> {
  const slash = rest.indexOf("/");
  if (slash < 1) return new Response("Not found", { status: 404 });
  const site = decodeURIComponent(rest.slice(0, slash)), key = decodeURIComponent(rest.slice(slash + 1));
  const row = await env.DB
    .prepare("SELECT storage_key, mime FROM media_assets WHERE site_key = ? AND key = ?")
    .bind(site, key)
    .first<{ storage_key: string; mime: string }>();
  if (!row) return new Response("Not found", { status: 404 });
  const obj = await env.MEDIA.get(row.storage_key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": row.mime, "cache-control": "public, max-age=86400" } });
}

async function handlePage(url: URL, env: Env, mount: SiteMount, local: string): Promise<Response> {
  const site = mount.manifest.site.key;
  const hit = await env.DB
    .prepare("SELECT key FROM pages WHERE site_key = ? AND route = ? UNION SELECT page_key AS key FROM page_aliases WHERE site_key = ? AND alias = ?")
    .bind(site, local, site, local)
    .first<{ key: string }>();
  const page = hit ? await snapshot<Page>(env, site, "page", hit.key) : null;
  if (!page) return new Response("Not found", { status: 404 });
  const prefix = mountPrefix(mount.basePath);
  if (page.route !== local) return Response.redirect(url.origin + (prefix + page.route || "/"), 301);

  const globals = (await snapshot<Globals>(env, site, "globals", "site")) ?? { header: { links: [] }, footer: { links: [] } };
  const names = new Set([...collectionRefs(page.sections), ...(globals.overlays ?? []).flatMap((ov) => collectionRefs(ov.sections))]);
  const collections: Record<string, CollectionItem[]> = {};
  await Promise.all([...names].map(async (n) => { collections[n] = (await snapshot<CollectionItem[]>(env, site, "collection", n)) ?? []; }));

  const html = renderPage(page, {
    brand: mount.brand, tokens: mount.tokens, globals, collections,
    // Legacy URL references (leading "/" or http) pass through; real media keys go through /media.
    media: (k) => (!k ? null : k.startsWith("/") || /^https?:\/\//.test(k) ? k : `${API.media}${encodeURIComponent(site)}/${k.split("/").map(encodeURIComponent).join("/")}`),
    route: page.route, siteKey: site, basePath: mount.basePath,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" } });
}

/** One factory for every deployment. The deployment entry only supplies which sites are mounted where. */
export function createPlatformWorker(o: PlatformWorkerOptions) {
  return {
    async fetch(req: Request, env: Env): Promise<Response> {
      const url = new URL(req.url);
      if (url.pathname === API.health) return json(ok({ sites: o.sites.map((s) => s.manifest.site.key), status: "ok" }));
      if (url.pathname === API.leads) return req.method === "POST" ? handleLead(req, env, o.sites) : json(err("method_not_allowed", "POST only"), 405);
      if (url.pathname.startsWith(API.media)) return handleMedia(env, url.pathname.slice(API.media.length));
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const hit = resolveMount(o.sites, url.pathname);
      return hit ? handlePage(url, env, hit.mount, hit.local) : new Response("Not found", { status: 404 });
    },
  };
}
