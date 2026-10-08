import type { CollectionItem, Section } from "@inneranimalmedia/site-contracts";
import type { RenderCtx } from "./context.ts";
import { esc, isRecord, paragraphs, resolveHref, str } from "./util.ts";

export type SectionFn = (data: Record<string, unknown>, ctx: RenderCtx, section: Section) => string;

function link(l: unknown, cls: string, ctx: RenderCtx): string {
  if (!isRecord(l) || !str(l.label)) return "";
  if (str(l.overlay)) return `<button type="button" class="${cls}" data-open-overlay="${esc(l.overlay)}">${esc(l.label)}</button>`;
  return `<a class="${cls}" href="${esc(resolveHref(ctx.basePath, str(l.href), l.root === true))}">${esc(l.label)}</a>`;
}

function media(ctx: RenderCtx, key: unknown, alt: string, cls = "s-media"): string {
  const url = ctx.media(str(key) || undefined);
  return url
    ? `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`
    : `<div class="${cls} s-media--empty" role="img" aria-label="${esc(alt || "Image placeholder")}"></div>`;
}

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x !== "") : []);

function head(data: Record<string, unknown>): string {
  const e = str(data.eyebrow), h = str(data.heading), i = str(data.intro);
  if (!e && !h && !i) return "";
  return `<div class="s-head">${e ? `<p class="s-eyebrow">${esc(e)}</p>` : ""}${h ? `<h2>${esc(h)}</h2>` : ""}${i ? `<p>${esc(i)}</p>` : ""}</div>`;
}

const badge = (d: Record<string, unknown>): string => (d.sample ? "Sample" : d.draft ? "Draft" : str(d.badge));

function fromCollection(source: unknown, ctx: RenderCtx): CollectionItem[] | null {
  if (!isRecord(source) || !str(source.collection)) return null;
  const items = (ctx.collections[str(source.collection)] ?? [])
    .filter((i) => i.status !== "archived")
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return items.slice(0, typeof source.limit === "number" ? source.limit : items.length);
}

export const hero: SectionFn = (d, ctx) => {
  const bg = str(d.mediaKey) ? `<div class="s-hero__bg">${media(ctx, d.mediaKey, str(d.alt), "s-media s-hero__img")}</div>` : "";
  const proof = list(d.proof);
  return `${bg}<div class="s-wrap s-hero__body">${d.eyebrow ? `<p class="s-eyebrow">${esc(d.eyebrow)}</p>` : ""}<h1>${esc(d.heading)}</h1>${d.body ? `<p class="s-lead">${esc(d.body)}</p>` : ""}<div class="s-actions">${link(d.primaryCta, "s-btn", ctx)}${link(d.secondaryCta, "s-btn s-btn--ghost", ctx)}</div>${proof.length ? `<ul class="s-proof">${proof.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}</div>`;
};

export const textSplit: SectionFn = (d, ctx) => {
  const points = list(d.points);
  const text = `<div>${d.eyebrow ? `<p class="s-eyebrow">${esc(d.eyebrow)}</p>` : ""}<h2>${esc(d.heading)}</h2>${paragraphs(d.body)}${points.length ? `<ul class="s-points">${points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}${d.cta ? `<div class="s-actions">${link(d.cta, "s-btn", ctx)}</div>` : ""}</div>`;
  if (!str(d.mediaKey)) return `<div class="s-wrap"><div class="s-split s-split--solo">${text}</div></div>`;
  return `<div class="s-wrap"><div class="s-split${d.reverse ? " s-split--rev" : ""}">${text}<div class="s-split__media">${media(ctx, d.mediaKey, str(d.alt) || str(d.heading))}</div></div></div>`;
};

export const cardGrid: SectionFn = (d, ctx) => {
  const layout = str(d.layout) || "cards";
  const cols = ["2", "3", "4"].includes(str(d.columns)) ? str(d.columns) : "3";
  const coll = fromCollection(d.source, ctx);
  const items = coll
    ? coll.map((i) => ({ title: i.title, body: str(i.data.body), mediaKey: str(i.data.mediaKey), alt: str(i.data.alt), href: str(i.data.href), meta: str(i.data.meta), badge: badge(i.data) }))
    : (Array.isArray(d.items) ? d.items.filter(isRecord) : []).map((i) => ({ title: str(i.title), body: str(i.body), mediaKey: str(i.mediaKey), alt: str(i.alt), href: str(i.href), meta: str(i.meta), badge: str(i.badge) }));
  const cards = items.map((it, n) => {
    const showMedia = layout === "listings" || layout === "team" || (layout === "cards" && it.mediaKey);
    const inner = `${showMedia ? media(ctx, it.mediaKey, it.alt || it.title, "s-media s-card__media") : ""}<div class="s-card__body">${layout === "steps" ? `<span class="s-card__num">${n + 1}</span>` : ""}${it.badge ? `<span class="s-badge">${esc(it.badge)}</span>` : ""}<h3>${esc(it.title)}</h3>${it.meta ? `<p class="s-card__meta">${esc(it.meta)}</p>` : ""}${it.body ? `<p>${esc(it.body)}</p>` : ""}</div>`;
    return it.href ? `<a class="s-card" href="${esc(resolveHref(ctx.basePath, it.href))}">${inner}</a>` : `<div class="s-card">${inner}</div>`;
  }).join("");
  return `<div class="s-wrap">${head(d)}<div class="s-grid s-grid--${cols}">${cards}</div>${d.cta ? `<p class="s-center" style="margin-top:2rem">${link(d.cta, "s-btn", ctx)}</p>` : ""}</div>`;
};

interface Pair { beforeKey: string; afterKey: string; beforeLabel: string; afterLabel: string; caption: string; alt: string; sample: boolean }

function pairsFrom(d: Record<string, unknown>, ctx: RenderCtx): Pair[] {
  const coll = fromCollection(d.source, ctx);
  if (coll) {
    return coll.filter((i) => str(i.data.beforeKey) && str(i.data.afterKey)).map((i) => ({
      beforeKey: str(i.data.beforeKey), afterKey: str(i.data.afterKey),
      beforeLabel: str(i.data.beforeLabel) || "Before", afterLabel: str(i.data.afterLabel) || "After",
      caption: i.title, alt: i.title, sample: Boolean(i.data.sample),
    }));
  }
  return (Array.isArray(d.pairs) ? d.pairs.filter(isRecord) : []).map((p) => ({
    beforeKey: str(p.beforeKey), afterKey: str(p.afterKey),
    beforeLabel: str(p.beforeLabel) || "Before", afterLabel: str(p.afterLabel) || "After",
    caption: str(p.caption), alt: str(p.alt) || str(p.caption) || "Project", sample: false,
  }));
}

export const beforeAfter: SectionFn = (d, ctx) => {
  const figs = pairsFrom(d, ctx).map((p) =>
    `<figure class="s-ba" data-ba style="--pos:50%"><div class="s-ba__stage">${media(ctx, p.beforeKey, `${p.beforeLabel}: ${p.alt}`, "s-media s-ba__img")}<div class="s-ba__after">${media(ctx, p.afterKey, `${p.afterLabel}: ${p.alt}`, "s-media s-ba__img")}</div><span class="s-ba__tag s-ba__tag--before">${esc(p.beforeLabel)}</span><span class="s-ba__tag s-ba__tag--after">${esc(p.afterLabel)}</span><div class="s-ba__divider" aria-hidden="true"><span>&#8596;</span></div><input class="s-ba__range" type="range" min="0" max="100" value="50" aria-label="Compare ${esc(p.beforeLabel)} and ${esc(p.afterLabel)}"></div>${p.caption ? `<figcaption>${esc(p.caption)}${p.sample ? ' <span class="s-badge">Sample</span>' : ""}</figcaption>` : ""}</figure>`).join("");
  return `<div class="s-wrap">${head(d)}<div class="s-ba-grid">${figs}</div></div>`;
};

export const testimonials: SectionFn = (d, ctx) => {
  const coll = fromCollection(d.source, ctx);
  const items = coll
    ? coll.map((i) => ({ quote: str(i.data.quote), by: i.title, meta: str(i.data.meta), tag: badge(i.data) }))
    : (Array.isArray(d.items) ? d.items.filter(isRecord) : []).map((i) => ({ quote: str(i.quote), by: str(i.by), meta: str(i.meta), tag: "" }));
  const quotes = items.map((q) => `<figure class="s-quote">${q.tag ? `<span class="s-badge">${esc(q.tag)}</span>` : ""}<blockquote>${esc(q.quote)}</blockquote><figcaption>${esc(q.by)}${q.meta ? ` &middot; ${esc(q.meta)}` : ""}</figcaption></figure>`).join("");
  return `<div class="s-wrap">${head(d)}<div class="s-grid s-grid--3">${quotes}</div></div>`;
};

export const ctaBanner: SectionFn = (d, ctx) =>
  `<div class="s-wrap s-cta">${d.eyebrow ? `<p class="s-eyebrow">${esc(d.eyebrow)}</p>` : ""}<h2>${esc(d.heading)}</h2>${d.body ? `<p class="s-lead" style="margin:0 auto">${esc(d.body)}</p>` : ""}<div class="s-actions">${link(d.cta, "s-btn", ctx)}${link(d.secondary, "s-btn s-btn--ghost", ctx)}</div></div>`;

const INPUT_TYPES = ["text", "email", "tel", "number", "date"];

export const contactForm: SectionFn = (d, ctx, section) => {
  const rows = (Array.isArray(d.fields) ? d.fields.filter(isRecord) : []).map((f) => {
    const name = str(f.name);
    const id = `f-${section.key}-${name}`;
    const type = str(f.type) || "text";
    const req = f.required ? " required" : "";
    let control: string;
    if (type === "textarea") control = `<textarea id="${esc(id)}" name="${esc(name)}" rows="4"${req}></textarea>`;
    else if (type === "select") control = `<select id="${esc(id)}" name="${esc(name)}"${req}><option value="">Select&hellip;</option>${(Array.isArray(f.options) ? f.options : []).map((o) => `<option>${esc(o)}</option>`).join("")}</select>`;
    else control = `<input id="${esc(id)}" name="${esc(name)}" type="${INPUT_TYPES.includes(type) ? type : "text"}"${req}>`;
    return `<div class="s-field"><label for="${esc(id)}">${esc(f.label)}${f.required ? " *" : ""}</label>${control}</div>`;
  }).join("");
  return `<div class="s-wrap s-wrap--narrow">${head({ heading: d.heading, intro: d.intro })}<form class="s-form" method="post" action="/api/leads" data-lead-form><input type="hidden" name="kind" value="${esc(str(d.form) || "contact")}"><input type="hidden" name="site" value="${esc(ctx.siteKey)}"><input type="hidden" name="sourceRoute" value="${esc(ctx.route)}"><div class="s-hp" aria-hidden="true"><label>Website <input name="company_website" tabindex="-1" autocomplete="off"></label></div>${rows}<button class="s-btn" type="submit">${esc(str(d.submitLabel) || "Send")}</button><p class="s-form__status" role="status" data-form-status></p></form></div>`;
};
