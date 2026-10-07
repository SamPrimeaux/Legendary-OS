// End-to-end: real deployment entry + real SQLite (same dialect as D1) seeded with BOTH sites in ONE database.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../deployments/legendary-os/src/index.ts";
import { esc } from "../packages/site-renderer/src/index.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(":memory:");
db.exec(readFileSync(join(ROOT, "packages/platform-db/migrations/0001_baseline.sql"), "utf8"));
const seed = readFileSync(join(ROOT, "deployments/legendary-os/dist/seed.sql"), "utf8");
db.exec(seed);
const count = (t) => db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n;
const before = ["sites", "pages", "sections", "publications"].map(count);
db.exec(seed); // re-seeding must be a no-op
assert.deepEqual(["sites", "pages", "sections", "publications"].map(count), before, "seed is not idempotent");
assert.equal(count("sites"), 2, "one database must hold both sites");

const D1 = { prepare(sql) { const st = db.prepare(sql); let args = []; const o = { bind(...a) { args = a; return o; }, async first() { return st.get(...args) ?? null; }, async all() { return { results: st.all(...args) }; }, async run() { return st.run(...args); } }; return o; } };
const env = { DB: D1, MEDIA: { async get() { return null; } } };
const get = (path, init) => worker.fetch(new Request("https://demo.test" + path, init), env);
const fixture = (name) => JSON.parse(readFileSync(join(ROOT, "fixtures/live-demo", name), "utf8"));
const heroOf = (f) => f.sections.find((s) => s.type === "hero").data.heading;

let n = 0;
const ok = (name) => console.log(`  ok ${++n} ${name}`);

// root mount = contractors site
let r = await get("/"); let html = await r.text();
assert.equal(r.status, 200); assert.ok(html.includes(esc(heroOf(fixture("site_contractors__home.json"))))); ok("/ serves the contractors home from the database");
assert.ok(html.includes('href="/process"')); ok("root-mounted nav links are unprefixed");
r = await get("/process"); assert.equal(r.status, 200); ok("/process 200");
r = await get("/theprocess", { redirect: "manual" }); assert.equal(r.status, 301); assert.equal(new URL(r.headers.get("location")).pathname, "/process"); ok("legacy /theprocess -> 301 /process");
r = await get("/available-homes", { redirect: "manual" }); assert.equal(r.status, 301); ok("legacy /available-homes -> 301");

// /scapes mount = scapes site, same database
for (const p of ["/scapes", "/scapes/"]) { r = await get(p); html = await r.text(); assert.equal(r.status, 200); }
assert.ok(html.includes(esc(heroOf(fixture("site_scapes__home.json"))))); ok("/scapes serves the scapes home");
assert.ok(html.includes('href="/scapes/services"') && !html.includes('href="/services"')); ok("scapes links carry the /scapes prefix");
assert.ok(html.includes('href="/dashboard"')); ok("utility link stays deployment-relative (/dashboard)");
r = await get("/scapes/services-1", { redirect: "manual" }); assert.equal(r.status, 301); assert.equal(new URL(r.headers.get("location")).pathname, "/scapes/services"); ok("legacy /scapes/services-1 -> 301 /scapes/services");
r = await get("/scapes/recent-projects", { redirect: "manual" }); assert.equal(new URL(r.headers.get("location")).pathname, "/scapes/projects"); ok("legacy /scapes/recent-projects -> /scapes/projects");

// isolation + 404s
assert.equal((await get("/scapes/process")).status, 404); assert.equal((await get("/services")).status, 404); assert.equal((await get("/nope")).status, 404); ok("sites cannot see each other's pages; unknown paths 404");

// health + leads (writes land on the right site)
r = await get("/api/health"); assert.deepEqual((await r.json()).data.sites.sort(), ["site_contractors", "site_scapes"]); ok("/api/health lists both mounted sites");
const lead = (body) => get("/api/leads", { method: "POST", body: JSON.stringify(body) });
r = await lead({ site: "site_scapes", kind: "quote", name: "Test Person", phone: "3375550100", message: "hi", project: "Hardscapes" });
assert.equal(r.status, 201); const row = db.prepare("SELECT site_key, kind, data_json FROM leads").get();
assert.equal(row.site_key, "site_scapes"); assert.equal(JSON.parse(row.data_json).project, "Hardscapes"); ok("lead is stored against the right site with extra fields kept");
assert.equal((await lead({ site: "site_scapes", name: "x" })).status, 422); ok("lead without email/phone rejected");
assert.equal((await lead({ site: "nope", name: "x", email: "a@b.co" })).status, 422); ok("lead for unknown site rejected");
const rows = count("leads"); r = await lead({ site: "site_scapes", name: "bot", email: "a@b.co", company_website: "http://spam" });
assert.equal(r.status, 200); assert.equal(count("leads"), rows); ok("honeypot swallowed without storing");

console.log(`runtime: ${n} checks passed`);
