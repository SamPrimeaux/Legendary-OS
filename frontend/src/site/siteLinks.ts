/** Scope page links to the current brand while retaining explicit cross-site links. */
export function siteHref(value: unknown, basePath = ''): string {
  const href = String(value ?? '').trim();
  if (!href) return '#';
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
    return /^(https?:|mailto:|tel:)/i.test(href) ? href : '#';
  }
  // Backslashes and control characters can disguise a browser URL scheme or host.
  if (/[\\\u0000-\u0020\u007f]/.test(href)) return '#';
  if (href.startsWith('//') || href.startsWith('#') || href.startsWith('?')) return href;
  const base = basePath.replace(/\/$/, '');
  const path = href.startsWith('/') ? href : `/${href}`;
  if (/^\/(scapes|site|dashboard|auth|api|assets|media|leads|projects|team|cms)(\/|\?|#|$)/.test(path)) return path;
  if (base && (path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}?`) || path.startsWith(`${base}#`))) return path;
  return `${base}${path}`;
}

export function scopeSectionLinks(data: Record<string, unknown>, basePath: string): Record<string, unknown> {
  const next = { ...data };
  for (const key of ['ctaHref', 'secondaryHref']) {
    if (key in next) next[key] = siteHref(next[key], basePath);
  }
  if (Array.isArray(next.items)) {
    next.items = next.items.map(item => {
      if (!item || typeof item !== 'object' || !('href' in item)) return item;
      return { ...item, href: siteHref(item.href, basePath) };
    });
  }
  return next;
}
