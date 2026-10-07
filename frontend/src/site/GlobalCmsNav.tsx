import React, { useEffect, useRef, useState } from 'react';
import { siteHref } from './siteLinks';

export type CmsNavLink = { label: string; href: string };

export type GlobalCmsNavModel = {
  id: string;
  siteId: string;
  brand: {
    mark?: string;
    logoAssetId?: string;
    logoUrl?: string;
    logoAlt?: string;
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

function Brand({ nav, footer = false, basePath = '' }: { nav: GlobalCmsNavModel; footer?: boolean; basePath?: string }) {
  return (
    <a className={`lc-brand${nav.brand.logoUrl ? ' lc-brand--image' : ''}${footer ? ' lc-brand--footer' : ''}`} href={siteHref(nav.brand.homeHref, basePath)}>
      {nav.brand.logoUrl ? (
        <img className="lc-brand__logo" src={nav.brand.logoUrl} alt={nav.brand.logoAlt || `${nav.brand.name}${nav.brand.sublabel ? ` ${nav.brand.sublabel}` : ''}`} />
      ) : (
        <>
          <span className="lc-brand__mark">{nav.brand.mark || nav.brand.name.slice(0, 1)}</span>
          <span><strong>{nav.brand.name}</strong>{nav.brand.sublabel ? <small>{nav.brand.sublabel}</small> : null}</span>
        </>
      )}
    </a>
  );
}

export function GlobalCmsHeader({ nav, basePath = '' }: { nav: GlobalCmsNavModel; basePath?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);
  return (
    <header className="lc-nav">
      <Brand nav={nav} basePath={basePath} />
      <nav className="lc-nav__links" aria-label="Public site navigation">
        {nav.header.links.map((link) => <a key={`${link.label}:${link.href}`} href={siteHref(link.href, basePath)}>{link.label}</a>)}
      </nav>
      <div className="lc-nav__actions">
        <button ref={menuButton} className="lc-mobile-menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="legendary-mobile-menu" onClick={() => setMenuOpen(value => !value)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{menuOpen ? <path d="m6 6 12 12M6 18 18 6"/> : <path d="M4 7h16M4 12h16M4 17h16"/>}</svg>
        </button>
        {(nav.header.utilityLinks || []).map((link) => <a className="lc-os-link" key={`${link.label}:${link.href}`} href={siteHref(link.href, basePath)}>{link.label}</a>)}
        {nav.header.cta ? <a className="lc-nav__cta" href={siteHref(nav.header.cta.href, basePath)}>{nav.header.cta.label}</a> : null}
      </div>
      {menuOpen ? <nav id="legendary-mobile-menu" className="lc-mobile-menu" aria-label="Mobile site navigation">
        {[...nav.header.links, ...(nav.header.utilityLinks || [])].map(link => <a key={`${link.label}:${link.href}`} href={siteHref(link.href, basePath)} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
        {nav.header.cta ? <a href={siteHref(nav.header.cta.href, basePath)} onClick={() => setMenuOpen(false)}>{nav.header.cta.label}</a> : null}
      </nav> : null}
    </header>
  );
}

export function GlobalCmsFooter({ nav, basePath = '' }: { nav: GlobalCmsNavModel; basePath?: string }) {
  return (
    <footer className="lc-footer">
      <Brand nav={nav} footer basePath={basePath} />
      <div>
        {nav.footer.location ? <span>{nav.footer.location}</span> : null}
        {nav.footer.phone ? <a href={siteHref(nav.footer.phoneHref || `tel:${nav.footer.phone}`, basePath)}>{nav.footer.phone}</a> : null}
      </div>
      <div>{nav.footer.links.map((link) => <a key={`${link.label}:${link.href}`} href={siteHref(link.href, basePath)}>{link.label}</a>)}</div>
      {nav.footer.note ? <p>{nav.footer.note}</p> : <span />}
    </footer>
  );
}
