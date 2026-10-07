import type { Section } from "@inneranimalmedia/site-contracts";

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v: unknown): string => String(v ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c] as string);
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const str = (v: unknown): string => (typeof v === "string" ? v : "");
export const paragraphs = (text: unknown): string =>
  str(text).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");

/** Only relative paths, anchors, tel:, mailto: and http(s) are allowed in hrefs. Protocol-relative (//) is not. */
export const safeHref = (href: string): string => (/^(\/(?!\/)|#|tel:|mailto:|https?:\/\/)/i.test(href) ? href : "#");

/** "/" and "" mean the root mount; "/blog/" becomes "/blog". */
export const mountPrefix = (basePath: string): string => (basePath === "/" ? "" : basePath.replace(/\/+$/, ""));

/** Site-relative href -> deployment URL. Anchors, absolute URLs, tel:/mailto: and `root` links are untouched. */
export function resolveHref(basePath: string, href: string, root = false): string {
  const safe = safeHref(href);
  if (root || !safe.startsWith("/")) return safe;
  const prefix = mountPrefix(basePath);
  return safe === "/" ? prefix || "/" : prefix + safe;
}

/** Names of collections a list of sections binds to (so the runtime knows what to load). */
export function collectionRefs(sections: Section[]): string[] {
  const out = new Set<string>();
  for (const s of sections) {
    const src = s.data.source;
    if (isRecord(src) && typeof src.collection === "string") out.add(src.collection);
  }
  return [...out];
}
