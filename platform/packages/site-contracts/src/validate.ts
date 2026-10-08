import { ROLES } from "./types.ts";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export function validateManifest(m: unknown): string[] {
  const e: string[] = [];
  if (!isObj(m)) return ["manifest: must be an object"];
  if (m.schemaVersion !== 1) e.push("manifest.schemaVersion must be 1");
  const app = m.app;
  if (!isObj(app) || !nonEmpty(app.id) || !/^[a-z][a-z0-9-]*$/.test(app.id)) e.push("manifest.app.id must be a lowercase slug");
  if (!isObj(app) || !nonEmpty(app.kind)) e.push("manifest.app.kind is required");
  const site = m.site;
  if (!isObj(site) || !nonEmpty(site.key) || !/^[a-z][a-z0-9_-]*$/.test(site.key)) e.push("manifest.site.key must be a stable lowercase key");
  const org = m.organization;
  if (!isObj(org) || !nonEmpty(org.id)) e.push("manifest.organization.id is required");
  const identity = m.identity;
  if (!isObj(identity) || identity.provider !== "inneranimalmedia") e.push('manifest.identity.provider must be "inneranimalmedia"');
  const theme = m.theme;
  if (!isObj(theme) || !nonEmpty(theme.base) || !nonEmpty(theme.tokens)) e.push("manifest.theme.base and manifest.theme.tokens are required");
  if (!nonEmpty(m.brand)) e.push("manifest.brand (path) is required");
  const features = m.features;
  if (!Array.isArray(features) || !features.every(nonEmpty)) e.push("manifest.features must be a string array");
  const roles = m.roles;
  if (!Array.isArray(roles) || !roles.every((r) => (ROLES as readonly string[]).includes(String(r)))) e.push("manifest.roles must only contain: " + ROLES.join(", "));
  const content = m.content;
  if (!isObj(content) || !nonEmpty(content.seed)) e.push("manifest.content.seed (path) is required");
  return e;
}

export function validateDeployment(d: unknown, knownApps: string[]): string[] {
  const e: string[] = [];
  if (!isObj(d)) return ["deployment: must be an object"];
  if (d.schemaVersion !== 1) e.push("deployment.schemaVersion must be 1");
  if (!nonEmpty(d.id)) e.push("deployment.id is required");
  const cf = d.cloudflare;
  for (const k of ["worker", "d1", "r2"]) if (!isObj(cf) || !nonEmpty(cf[k])) e.push(`deployment.cloudflare.${k} is required`);
  const domains = d.domains;
  if (!Array.isArray(domains) || domains.length === 0 || !domains.every(nonEmpty)) e.push("deployment.domains must list at least one domain");
  const sites = d.sites;
  if (!Array.isArray(sites) || sites.length === 0) { e.push("deployment.sites must list at least one app mount"); return e; }
  const bases = new Set<string>();
  for (const s of sites) {
    if (!isObj(s) || !nonEmpty(s.app) || !nonEmpty(s.basePath)) { e.push("deployment.sites[]: app and basePath are required"); continue; }
    if (!knownApps.includes(s.app)) e.push(`deployment.sites: unknown app "${s.app}"`);
    if (!/^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/.test(s.basePath)) e.push(`deployment.sites: invalid basePath "${s.basePath}"`);
    if (bases.has(s.basePath)) e.push(`deployment.sites: duplicate basePath "${s.basePath}"`);
    bases.add(s.basePath);
  }
  return e;
}

export function validateBrand(b: unknown): string[] {
  const e: string[] = [];
  if (!isObj(b)) return ["brand: must be an object"];
  if (!nonEmpty(b.name)) e.push("brand.name is required");
  const c = b.contact;
  if (!isObj(c)) e.push("brand.contact is required");
  else if (c.phone !== undefined && !nonEmpty(c.phone)) e.push("brand.contact.phone must be non-empty when set");
  const logo = b.logo;
  if (logo !== undefined && (!isObj(logo) || !nonEmpty(logo.key) || !nonEmpty(logo.alt))) e.push("brand.logo needs key and alt");
  return e;
}

export function validateTokens(t: unknown): string[] {
  if (!isObj(t)) return ["tokens: must be an object"];
  const e: string[] = [];
  for (const [k, v] of Object.entries(t)) {
    if (!/^[a-z0-9-]+$/.test(k)) e.push(`tokens.${k}: key must match [a-z0-9-]+`);
    if (typeof v !== "string" || /[;{}<>]/.test(v)) e.push(`tokens.${k}: value must be a string without ; { } < >`);
  }
  return e;
}
