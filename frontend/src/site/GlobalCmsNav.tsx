import React from 'react';

export type CmsNavLink = { label: string; href: string };

export type GlobalCmsNavModel = {
  id: string;
  siteId: string;
  brand: {
    mark?: string;
    name: string;
    sublabel?: string;
    homeHref: string;
  };
  header: {
    links: CmsNavLink[];
    utilityLinks?: CmsNavLink[];
    cta?: CmsNavLink | null;
  };
  footer: {
    location?: string;
    phone?: string;
    phoneHref?: string;
    links: CmsNavLink[];
    note?: string;
  };
};

function Brand({ nav, footer = false }: { nav: GlobalCmsNavModel; footer?: boolean }) {
  return (
    <a className={`lc-brand${footer ? ' lc-brand--footer' : ''}`} href={nav.brand.homeHref}>
      <span className="lc-brand__mark">{nav.brand.mark || nav.brand.name.slice(0, 1)}</span>
      <span><strong>{nav.brand.name}</strong>{nav.brand.sublabel ? <small>{nav.brand.sublabel}</small> : null}</span>
    </a>
  );
}

export function GlobalCmsHeader({ nav }: { nav: GlobalCmsNavModel }) {
  return (
    <header className="lc-nav">
      <Brand nav={nav} />
      <nav className="lc-nav__links" aria-label="Public site navigation">
        {nav.header.links.map((link) => <a key={`${link.label}:${link.href}`} href={link.href}>{link.label}</a>)}
      </nav>
      <div className="lc-nav__actions">
        {(nav.header.utilityLinks || []).map((link) => <a className="lc-os-link" key={`${link.label}:${link.href}`} href={link.href}>{link.label}</a>)}
        {nav.header.cta ? <a className="lc-nav__cta" href={nav.header.cta.href}>{nav.header.cta.label}</a> : null}
      </div>
    </header>
  );
}

export function GlobalCmsFooter({ nav }: { nav: GlobalCmsNavModel }) {
  return (
    <footer className="lc-footer">
      <Brand nav={nav} footer />
      <div>
        {nav.footer.location ? <span>{nav.footer.location}</span> : null}
        {nav.footer.phone ? <a href={nav.footer.phoneHref || `tel:${nav.footer.phone}`}>{nav.footer.phone}</a> : null}
      </div>
      <div>{nav.footer.links.map((link) => <a key={`${link.label}:${link.href}`} href={link.href}>{link.label}</a>)}</div>
      {nav.footer.note ? <p>{nav.footer.note}</p> : <span />}
    </footer>
  );
}
