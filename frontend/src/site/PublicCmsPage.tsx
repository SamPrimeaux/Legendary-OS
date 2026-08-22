import React, { useEffect, useMemo, useState } from 'react';
import './publicCmsPage.css';

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
  sections: Array<{
    id: string;
    type: string;
    name: string;
    data: Record<string, unknown>;
    blocks: Array<Record<string, unknown>>;
  }>;
  theme: { id: string; name: string; tokens: Record<string, string | number> } | null;
};

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
      '--site-brand': String(tokens.brand ?? '#111111'),
      '--site-surface': String(tokens.surface ?? '#f4f1ea'),
      '--site-radius': `${Number(tokens.radius ?? 18)}px`,
    } as React.CSSProperties;
  }, [page]);

  if (error) {
    return (
      <main className="public-site public-site--state">
        <p className="public-site__kicker">Legendary OS · CMS</p>
        <h1>{error}</h1>
        <p>Open the CMS, publish the page, then reload this storefront.</p>
        <a href="/cms">Open CMS</a>
      </main>
    );
  }

  if (!page) {
    return <main className="public-site public-site--state"><p>Loading published site…</p></main>;
  }

  return (
    <main className="public-site" style={themeStyle}>
      <header className="public-site__header">
        <a className="public-site__brand" href={`/site/${siteKey}`}>{page.site.name}</a>
        <span className="public-site__domain">{page.site.domain}</span>
      </header>
      {page.sections.map((section) => (
        <section key={section.id} className={`public-section public-section--${section.type}`}>
          {section.data.eyebrow ? <p className="public-section__eyebrow">{String(section.data.eyebrow)}</p> : null}
          {section.data.heading ? <h1>{String(section.data.heading)}</h1> : null}
          {section.data.body ? <p className="public-section__body">{String(section.data.body)}</p> : null}
          {section.data.ctaLabel ? (
            <a className="public-section__cta" href={String(section.data.ctaHref || '#')}>{String(section.data.ctaLabel)}</a>
          ) : null}
        </section>
      ))}
      <footer className="public-site__footer">
        <span>{page.site.name}</span>
        <span>Published from Legendary OS</span>
      </footer>
    </main>
  );
}
