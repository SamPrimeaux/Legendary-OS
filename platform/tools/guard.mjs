#!/usr/bin/env node
// Guards: (1) no customer branding in shared code, (2) migrations are schema-only and immutable once locked.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

// ---- 1. brand terms come from the apps' own brand packs -------------------
const terms = new Set();
const appsDir = join(ROOT, "apps");
for (const id of readdirSync(appsDir)) {
  const dir = join(appsDir, id);
  if (!statSync(dir).isDirectory()) continue;
  terms.add(id);
  const manifestPath = join(dir, "app.manifest.json");
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const brandPath = join(dir, manifest.brand ?? "brand/brand.json");
  if (existsSync(brandPath)) {
    const brand = JSON.parse(readFileSync(brandPath, "utf8"));
    for (const s of [brand.name, brand.legalName]) {
      if (!s) continue;
      terms.add(s);
      s.split(/\s+/).filter((w) => w.length >= 6).forEach((w) => terms.add(w));
    }
    const digits = (brand.contact?.phone ?? "").replace(/\D/g, "");
    if (digits.length >= 10) terms.add(digits.slice(-10));
  }
}
const depRoot = join(ROOT, "deployments");
if (existsSync(depRoot)) {
  for (const id of readdirSync(depRoot)) {
    const p = join(depRoot, id, "deployment.json");
    if (!existsSync(p)) continue;
    const dep = JSON.parse(readFileSync(p, "utf8"));
    terms.add(id);
    for (const d of dep.domains ?? []) terms.add(d.replace(/^www\./, "").split(".")[0]);
  }
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = [...terms].filter((t) => t.length >= 4).map((t) => ({ t, re: new RegExp(`(^|[^a-z0-9])${esc(t.toLowerCase())}([^a-z0-9]|$)`, "i") }));
const SCAN_EXT = new Set([".ts", ".mjs", ".js", ".json", ".sql", ".md", ".css", ".html"]);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (SCAN_EXT.has(extname(p))) out.push(p);
  }
  return out;
}
for (const base of ["packages", "tools"]) {
  for (const file of walk(join(ROOT, base))) {
    if (file.endsWith("migrations.lock.json")) continue;
    const text = readFileSync(file, "utf8");
    for (const { t, re } of patterns) if (re.test(text)) errors.push(`brand term "${t}" found in shared code: ${file.replace(ROOT + "/", "")}`);
  }
}

// ---- 2. migrations ---------------------------------------------------------
const migDir = join(ROOT, "packages/platform-db/migrations");
const files = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
const hashes = {};
for (const f of files) {
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(f)) errors.push(`migration name must match NNNN_name.sql: ${f}`);
  const raw = readFileSync(join(migDir, f), "utf8");
  hashes[f] = createHash("sha256").update(raw).digest("hex");
  const code = raw.replace(/--.*$/gm, "");
  if (/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/im.test(code)) errors.push(`migration ${f} contains data statements; migrations are schema-only`);
}
const lockPath = join(ROOT, "packages/platform-db/migrations.lock.json");
if (!existsSync(lockPath)) errors.push("packages/platform-db/migrations.lock.json missing; run: node tools/los.mjs db-lock");
else {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  for (const [f, h] of Object.entries(lock)) {
    if (!hashes[f]) errors.push(`locked migration removed: ${f}`);
    else if (hashes[f] !== h) errors.push(`released migration was edited: ${f} (add a new migration instead)`);
  }
  for (const f of files) if (!lock[f]) errors.push(`migration not in lock: ${f} (run: node tools/los.mjs db-lock when releasing)`);
}

if (errors.length) { console.error("guard FAILED:\n - " + errors.join("\n - ")); process.exit(1); }
console.log(`guard OK (${patterns.length} brand terms checked across shared code, ${files.length} migration(s) locked)`);
