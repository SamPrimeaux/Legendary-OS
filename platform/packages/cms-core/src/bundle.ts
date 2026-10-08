import type { Section, SiteBundle } from "@inneranimalmedia/site-contracts";
import type { Registry } from "./registry.ts";

const ROUTE_RE = /^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;
const KEY_RE = /^[a-z0-9][a-z0-9-]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function overlayRefs(value: unknown, out: string[]): void {
  if (Array.isArray(value)) value.forEach((v) => overlayRefs(v, out));
  else if (isObj(value)) {
    if (typeof value.overlay === "string") out.push(value.overlay);
    Object.values(value).forEach((v) => overlayRefs(v, out));
  }
}

function checkSections(sections: Section[], base: string, registry: Registry, errors: string[]): void {
  const seen = new Set<string>();
  sections.forEach((s, i) => {
    const at = `${base}.sections[${i}](${s.key})`;
    if (!KEY_RE.test(s.key)) errors.push(`${at}: key must match ${KEY_RE}`);
    if (seen.has(s.key)) errors.push(`${at}: duplicate section key`);
    seen.add(s.key);
    const def = registry.sections.get(s.type);
    if (!def) { errors.push(`${at}: unknown section type "${s.type}"`); return; }
    if (s.preset && def.presets && !def.presets.includes(s.preset)) errors.push(`${at}: unknown preset "${s.preset}"`);
    errors.push(...registry.validateFields(def.fields, s.data, `${at}.data`));
    const src = s.data.source;
    if (isObj(src) && typeof src.collection === "string" && !registry.collections.has(src.collection)) {
      errors.push(`${at}.data.source: unknown collection "${src.collection}"`);
    }
  });
}

/** Validates a content bundle against the registry. Returns human-readable errors; empty = valid. */
export function validateBundle(bundle: SiteBundle, registry: Registry): string[] {
  const errors: string[] = [];
  if (bundle.schemaVersion !== 1) errors.push("bundle.schemaVersion must be 1");

  const overlays = bundle.globals.overlays ?? [];
  const overlayKeys = new Set<string>();
  overlays.forEach((o) => {
    if (overlayKeys.has(o.key)) errors.push(`overlay "${o.key}": duplicate key`);
    overlayKeys.add(o.key);
    checkSections(o.sections, `overlays.${o.key}`, registry, errors);
  });

  const routes = new Map<string, string>();
  const claim = (route: string, owner: string) => {
    if (!ROUTE_RE.test(route)) errors.push(`${owner}: invalid route "${route}"`);
    const prev = routes.get(route);
    if (prev) errors.push(`${owner}: route "${route}" already used by ${prev}`);
    routes.set(route, owner);
  };
  const pageKeys = new Set<string>();
  bundle.pages.forEach((p) => {
    if (pageKeys.has(p.key)) errors.push(`page "${p.key}": duplicate key`);
    pageKeys.add(p.key);
    claim(p.route, `page "${p.key}"`);
    (p.aliases ?? []).forEach((a) => claim(a, `page "${p.key}" alias`));
    checkSections(p.sections, `pages.${p.key}`, registry, errors);
  });

  const refs: string[] = [];
  overlayRefs(bundle.globals, refs);
  bundle.pages.forEach((p) => overlayRefs(p.sections, refs));
  refs.forEach((r) => { if (!overlayKeys.has(r)) errors.push(`unknown overlay "${r}"`); });

  for (const [name, items] of Object.entries(bundle.collections)) {
    const def = registry.collections.get(name);
    if (!def) { errors.push(`collection "${name}": not defined in the registry`); continue; }
    const slugs = new Set<string>();
    items.forEach((it) => {
      if (!KEY_RE.test(it.slug)) errors.push(`collections.${name}.${it.slug}: slug must match ${KEY_RE}`);
      if (slugs.has(it.slug)) errors.push(`collections.${name}.${it.slug}: duplicate slug`);
      slugs.add(it.slug);
      if (!it.title) errors.push(`collections.${name}.${it.slug}: title is required`);
      errors.push(...registry.validateFields(def.fields, it.data, `collections.${name}.${it.slug}.data`));
    });
  }
  return errors;
}
