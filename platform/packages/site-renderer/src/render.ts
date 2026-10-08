import type { Link, Page, Section } from "@inneranimalmedia/site-contracts";
import type { RenderCtx } from "./context.ts";
import { ENHANCE_JS } from "./enhance.ts";
import { beforeAfter, cardGrid, contactForm, ctaBanner, hero, testimonials, textSplit, type SectionFn } from "./sections.ts";
import { BASE_CSS } from "./styles.ts";
import { esc, mountPrefix, resolveHref, str } from "./util.ts";

const RENDERERS: Record<string, SectionFn> = {
  hero,
  "text-split": textSplit,
  "card-grid": cardGrid,
  "before-after": beforeAfter,
  testimonials,
  "cta-banner": ctaBanner,
  "contact-form": contactForm,
};

export const SECTION_TYPES = Object.keys(RENDERERS);

export function renderSection(section: Section, ctx: RenderCtx): string {
  if (section.visible === false) return "";
  const fn = RENDERERS[section.type];
  const st = section.settings ?? {};
  const surface = st.surface ?? (section.type === "hero" ? "inverse" : "canvas");
  const spacing = st.spacing ?? (section.type === "hero" ? "none" : "md");
  const width = st.width ?? "content";
  const body = fn ? fn(section.data, ctx, section) : `<div class="s-wrap"><p class="s-missing">Unknown section type: ${esc(section.type)}</p></div>`;
  return `<section id="${esc(st.anchor || section.key)}" class="s s--${esc(surface)} s--sp-${esc(spacing)} s--w-${esc(width)} s-${esc(section.type)}" data-section="${esc(section.key)}">${body}</section>`;
}

const tokenCss = (tokens: Record<string, string>): string =>
  Object.entries(tokens).filter(([k, v]) => /^[a-z0-9-]+$/.test(k) && !/[;{}<>]/.test(v)).map(([k, v]) => `--${k}:${v}`).join(";");

const isActive = (href: string | undefined, route: string): boolean =>
  !!href && (href === route || (href !== "/" && !href.includes("#") && route.startsWith(href + "/")));

function navLink(l: Link, ctx: RenderCtx, cls = ""): string {
  if (l.overlay) return `<button type="button" class="s-btn" data-open-overlay="${esc(l.overlay)}">${esc(l.label)}</button>`;
  const active = !l.root && isActive(l.href, ctx.route);
  return `<a${cls ? ` class="${cls}"` : ""} href="${esc(resolveHref(ctx.basePath, str(l.href), l.root === true))}"${active ? ' aria-current="page"' : ""}>${esc(l.label)}</a>`;
}

function header(ctx: RenderCtx): string {
  const { brand, globals } = ctx;
  const a = globals.announcement;
  const bar = a?.enabled ? `<div class="s-announce">${a.href ? `<a href="${esc(resolveHref(ctx.basePath, a.href))}">${esc(a.text)}</a>` : esc(a.text)}</div>` : "";
  const logoDef = brand.logo;
  const logoUrl = logoDef ? ctx.media(logoDef.key) : null;
  const mark = logoDef && logoUrl
    ? `<img class="s-logo" src="${esc(logoUrl)}" alt="${esc(logoDef.alt)}">`
    : `${brand.mark ? `<span class="s-mark" aria-hidden="true">${esc(brand.mark)}</span>` : ""}<span class="s-brandname">${esc(brand.name)}</span>`;
  const links = globals.header.links.map((l) => navLink(l, ctx)).join("");
  const utility = (globals.header.utility ?? []).map((l) => navLink(l, ctx, "s-nav__utility")).join("");
  const cta = globals.header.cta ? navLink(globals.header.cta, ctx) : "";
  const home = mountPrefix(ctx.basePath) || "/";
  return `${bar}<header class="s-header"><div class="s-header__bar"><a href="${esc(home)}" aria-label="${esc(brand.name)}" style="text-decoration:none">${mark}</a><button type="button" class="s-nav__toggle" data-nav-toggle aria-label="Menu">&#9776;</button><nav class="s-nav" aria-label="Primary">${links}${utility}${cta}</nav></div></header>`;
}

function footer(ctx: RenderCtx): string {
  const { brand, globals } = ctx;
  const c = brand.contact;
  const contact = [
    c.phone ? `<li><a href="${esc(c.phoneHref ?? "#")}">${esc(c.phone)}</a></li>` : "",
    c.email ? `<li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : "",
    c.serviceArea ? `<li>${esc(c.serviceArea)}</li>` : "",
    c.address ? `<li>${esc(c.address)}</li>` : "",
  ].join("");
  const links = globals.footer.links.map((l) => `<li>${navLink(l, ctx)}</li>`).join("");
  return `<footer class="s-footer"><div class="s-wrap"><div class="s-footer__grid"><div><strong>${esc(brand.name)}</strong>${brand.tagline ? `<p>${esc(brand.tagline)}</p>` : ""}${globals.footer.note ? `<p>${esc(globals.footer.note)}</p>` : ""}</div><div><ul>${links}</ul></div><div><ul>${contact}</ul></div></div><p class="s-footer__legal">${esc(brand.legal?.copyright ?? `\u00a9 ${brand.name}`)}</p></div></footer>`;
}

function overlays(ctx: RenderCtx): string {
  return (ctx.globals.overlays ?? []).map((o) =>
    `<dialog class="s-overlay" id="ov-${esc(o.key)}" data-trigger="${esc(o.trigger.type)}"${o.trigger.delayMs ? ` data-delay="${Number(o.trigger.delayMs)}"` : ""} aria-label="${esc(o.title)}"><button type="button" class="s-overlay__close" data-close aria-label="Close">&times;</button>${o.sections.map((s) => renderSection(s, ctx)).join("")}</dialog>`).join("");
}

/** Contract in, full HTML document out. The same function serves every site. */
export function renderPage(page: Page, ctx: RenderCtx): string {
  const suffix = ctx.brand.seo?.titleSuffix ?? ` | ${ctx.brand.name}`;
  const title = page.seo?.title ?? page.title + suffix;
  const desc = page.seo?.description ?? page.description ?? ctx.brand.seo?.defaultDescription ?? "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}">` : ""}<style>${BASE_CSS}:root{${tokenCss(ctx.tokens)}}</style></head><body data-route="${esc(page.route)}">${header(ctx)}<main>${page.sections.map((s) => renderSection(s, ctx)).join("")}</main>${footer(ctx)}${overlays(ctx)}<script>${ENHANCE_JS}</script></body></html>`;
}
