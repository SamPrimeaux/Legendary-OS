import React, { useEffect, useMemo, useState } from 'react';
import './publicCmsPage.css';

type SectionData = Record<string, unknown>;

type PublicSection = {
  id: string;
  type: string;
  name: string;
  data: SectionData;
  blocks: Array<Record<string, unknown>>;
};

type PublicPage = {
  site: {
    id: string;
    brandId: string;
    name: string;
    domain: string | null;
  };
  page: {
    id: string;
    title: string;
    route: string;
    pageType: string;
    status: string;
    seo: { title: string | null; description: string | null };
  };
  sections: PublicSection[];
  theme: { id: string; name: string; tokens: Record<string, string | number> } | null;
};

function text(value: unknown, fallback = '') { return value == null ? fallback : String(value); }
function records(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object')) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : []; }

function SectionHeading({ data, align = 'left' }: { data: SectionData; align?: 'left' | 'center' }) {
  return (
    <div className={`public-heading public-heading--${align}`}>
      {data.eyebrow ? <p className="public-kicker">{text(data.eyebrow)}</p> : null}
      {data.heading ? <h2>{text(data.heading)}</h2> : null}
      {data.body ? <p>{text(data.body)}</p> : null}
    </div>
  );
}

function CmsSection({ section }: { section: PublicSection }) {
  const data = section.data;

  if (section.type === 'hero') {
    return (
      <section className="lc-section lc-hero" id="top">
        <div className="lc-hero__copy">
          {data.eyebrow ? <p className="public-kicker">{text(data.eyebrow)}</p> : null}
          <h1>{text(data.heading)}</h1>
          <p className="lc-hero__body">{text(data.body)}</p>
          <div className="lc-actions">
            <a className="lc-btn lc-btn--light" href={text(data.ctaHref, '#contact')}>{text(data.ctaLabel, 'Start your build')}</a>
            <a className="lc-text-link" href="#work">Explore our work <span>↘</span></a>
          </div>
          <div className="lc-hero__proof">
            <span>Custom homes</span><i />
            <span>Renovations</span><i />
            <span>Acadiana</span>
          </div>
        </div>
        <div className="lc-hero__visual">
          <img src={text(data.image)} alt={text(data.imageAlt, 'Legendary Contractors custom home')} />
          <div className="lc-hero__badge"><strong>Legendary</strong><span>Design · Build · Live</span></div>
        </div>
      </section>
    );
  }

  if (section.type === 'intro') {
    const points = strings(data.points);
    return (
      <section className="lc-section lc-intro" id="about">
        <div className="lc-intro__lead"><SectionHeading data={data} /></div>
        <div className="lc-intro__details">
          {points.map((point, index) => <div className="lc-value" key={point}><span>0{index + 1}</span><p>{point}</p></div>)}
        </div>
      </section>
    );
  }

  if (section.type === 'services') {
    const items = records(data.items);
    return (
      <section className="lc-section lc-services" id="services">
        <SectionHeading data={data} />
        <div className="lc-service-grid">
          {items.map((item, index) => (
            <article className="lc-service-card" key={text(item.title, String(index))}>
              <span className="lc-service-card__number">0{index + 1}</span>
              <h3>{text(item.title)}</h3>
              <p>{text(item.body)}</p>
              <a href={text(item.href, '#contact')}>Learn more <span>→</span></a>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'gallery') {
    const items = records(data.items);
    return (
      <section className="lc-section lc-work" id="work">
        <div className="lc-work__head"><SectionHeading data={data} /><a href={text(data.ctaHref, '#')}>{text(data.ctaLabel, 'View portfolio')} <span>→</span></a></div>
        <div className="lc-gallery">
          {items.map((item, index) => (
            <figure className={`lc-gallery__item lc-gallery__item--${index + 1}`} key={text(item.image, String(index))}>
              <img src={text(item.image)} alt={text(item.alt, 'Legendary Contractors project')} />
              <figcaption><strong>{text(item.title)}</strong><span>{text(item.meta)}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'process') {
    const items = records(data.items);
    return (
      <section className="lc-section lc-process" id="process">
        <SectionHeading data={data} />
        <ol className="lc-process-list">
          {items.map((item, index) => (
            <li key={text(item.title, String(index))}>
              <span>0{index + 1}</span><div><h3>{text(item.title)}</h3><p>{text(item.body)}</p></div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (section.type === 'listings') {
    const items = records(data.items);
    return (
      <section className="lc-section lc-listings" id="homes">
        <div className="lc-work__head"><SectionHeading data={data} /><a href={text(data.ctaHref, '#')}>{text(data.ctaLabel, 'See available homes')} <span>→</span></a></div>
        <div className="lc-listing-grid">
          {items.map((item) => (
            <article className="lc-listing" key={text(item.title)}>
              <div className="lc-listing__image"><img src={text(item.image)} alt={text(item.title)} /><span>{text(item.status, 'Available')}</span></div>
              <div className="lc-listing__copy"><h3>{text(item.title)}</h3><p>{text(item.location)}</p><div>{text(item.details)}</div></div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'cta') {
    return (
      <section className="lc-section lc-cta" id="contact">
        <p className="public-kicker">{text(data.eyebrow)}</p>
        <h2>{text(data.heading)}</h2>
        <p>{text(data.body)}</p>
        <div className="lc-actions">
          <a className="lc-btn lc-btn--dark" href={text(data.ctaHref, '#')}>{text(data.ctaLabel, 'Start a conversation')}</a>
          {data.secondaryLabel ? <a className="lc-text-link lc-text-link--dark" href={text(data.secondaryHref, '#')}>{text(data.secondaryLabel)}</a> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="lc-section lc-generic">
      <SectionHeading data={data} />
      {data.ctaLabel ? <a className="lc-btn lc-btn--dark" href={text(data.ctaHref, '#')}>{text(data.ctaLabel)}</a> : null}
    </section>
  );
}

export function PublicCmsPage({ siteKey, route = '/' }: { siteKey: string; route?: string }) {
  const [page, setPage] = useState<PublicPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(null);
    setError(null);
    fetch(`/api/public/sites/${encodeURIComponent(siteKey)}/page?route=${encodeURIComponent(route)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 404 ? 'This page has not been published yet.' : 'Could not load page.');
        return response.json() as Promise<PublicPage>;
      })
      .then((data) => {
        setPage(data);
        if (data.page.seo.title) document.title = data.page.seo.title;
      })
      .catch((reason: Error) => setError(reason.message));
  }, [route, siteKey]);

  const themeStyle = useMemo(() => {
    const tokens = page?.theme?.tokens ?? {};
    return {
      '--site-brand': String(tokens.brand ?? '#10110f'),
      '--site-surface': String(tokens.surface ?? '#f3f0e9'),
      '--site-radius': `${Number(tokens.radius ?? 18)}px`,
    } as React.CSSProperties;
  }, [page]);

  if (error) {
    return (
      <main className="public-site public-site--state">
        <p className="public-kicker">Legendary OS · CMS</p>
        <h1>{error}</h1>
        <p>Open the CMS, publish the page, then reload this storefront.</p>
        <a href="/cms">Open CMS</a>
      </main>
    );
  }

  if (!page) return <main className="public-site public-site--state"><p>Loading published site…</p></main>;

  const isContractors = page.site.brandId === 'contractors';
  return (
    <main className={`public-site${isContractors ? ' public-site--contractors' : ''}`} style={themeStyle}>
      <header className="lc-nav">
        <a className="lc-brand" href={route === '/' ? '/' : `/site/${siteKey}`}><span className="lc-brand__mark">L</span><span><strong>Legendary</strong><small>Contractors</small></span></a>
        <nav className="lc-nav__links" aria-label="Public site navigation">
          <a href="#work">Our work</a><a href="#process">Process</a><a href="#homes">Available homes</a><a href="#about">About</a>
        </nav>
        <div className="lc-nav__actions"><a className="lc-os-link" href="/dashboard">Legendary OS</a><a className="lc-nav__cta" href="#contact">Start a project</a></div>
      </header>

      {page.sections.map((section) => <CmsSection key={section.id} section={section} />)}

      <footer className="lc-footer">
        <a className="lc-brand lc-brand--footer" href="#top"><span className="lc-brand__mark">L</span><span><strong>Legendary</strong><small>Contractors</small></span></a>
        <div><span>Lafayette, Louisiana</span><a href="tel:+13375525207">337.552.5207</a></div>
        <div><a href="#work">Work</a><a href="#process">Process</a><a href="#contact">Contact</a></div>
        <p>Built and managed with Legendary OS.</p>
      </footer>
    </main>
  );
}
