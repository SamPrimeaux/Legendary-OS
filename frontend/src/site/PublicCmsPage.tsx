import React, { useEffect, useMemo, useState } from 'react';
import { GlobalCmsFooter, GlobalCmsHeader, type GlobalCmsNavModel } from './GlobalCmsNav';
import './publicCmsPage.css';

export type SectionData = Record<string, unknown>;
export type PublicSection = { id:string; type:string; name:string; visible?:boolean; sortOrder?:number; data:SectionData; blocks:Array<Record<string,unknown>> };
export type PublicPageModel = {
  site:{ id:string; brandId:string; name:string; domain:string|null };
  page:{ id:string; title:string; route:string; pageType:string; status:string; seo:{ title:string|null; description:string|null } };
  sections:PublicSection[];
  theme:{ id:string; name:string; tokens:Record<string,string|number> }|null;
  globalCmsNav?: GlobalCmsNavModel | null;
};

function text(value: unknown, fallback = '') { return value == null ? fallback : String(value); }
function records(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object')) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : []; }

function SectionHeading({ data }: { data: SectionData }) {
  return <div className="public-heading">{data.eyebrow ? <p className="public-kicker">{text(data.eyebrow)}</p> : null}{data.heading ? <h2>{text(data.heading)}</h2> : null}{data.body ? <p>{text(data.body)}</p> : null}</div>;
}

function CmsSection({ section }: { section: PublicSection }) {
  const data = section.data;
  if (section.type === 'hero') {
    const proof = strings(data.proof);
    return <section className="lc-section lc-hero" id={text(data.anchor, 'top')}>
      <div className="lc-hero__copy">
        {data.eyebrow ? <p className="public-kicker">{text(data.eyebrow)}</p> : null}
        <h1>{text(data.heading)}</h1><p className="lc-hero__body">{text(data.body)}</p>
        <div className="lc-actions">{data.ctaLabel ? <a className="lc-btn lc-btn--light" href={text(data.ctaHref, '#')}>{text(data.ctaLabel)}</a> : null}{data.secondaryLabel ? <a className="lc-text-link" href={text(data.secondaryHref, '#')}>{text(data.secondaryLabel)} <span>↘</span></a> : null}</div>
        {proof.length ? <div className="lc-hero__proof">{proof.map((item,index) => <React.Fragment key={`${item}-${index}`}><span>{item}</span>{index < proof.length - 1 ? <i /> : null}</React.Fragment>)}</div> : null}
      </div>
      {data.image ? <div className="lc-hero__visual"><img src={text(data.image)} alt={text(data.imageAlt, text(data.heading))} />{data.badgeTitle ? <div className="lc-hero__badge"><strong>{text(data.badgeTitle)}</strong><span>{text(data.badgeSubtitle)}</span></div> : null}</div> : null}
    </section>;
  }
  if (section.type === 'intro' || section.type === 'content') {
    const points = strings(data.points);
    return <section className="lc-section lc-intro" id={text(data.anchor, section.id)}><div className="lc-intro__lead"><SectionHeading data={data} /></div>{points.length ? <div className="lc-intro__details">{points.map((point,index)=><div className="lc-value" key={`${point}-${index}`}><span>0{index+1}</span><p>{point}</p></div>)}</div> : null}</section>;
  }
  if (section.type === 'services') {
    const items = records(data.items);
    return <section className="lc-section lc-services" id={text(data.anchor, section.id)}><SectionHeading data={data} /><div className="lc-service-grid">{items.map((item,index)=><article className="lc-service-card" key={`${text(item.title)}-${index}`}><span className="lc-service-card__number">0{index+1}</span><h3>{text(item.title)}</h3><p>{text(item.body)}</p>{item.href ? <a href={text(item.href)}>Learn more <span>→</span></a> : null}</article>)}</div></section>;
  }
  if (section.type === 'gallery') {
    const items = records(data.items);
    return <section className="lc-section lc-work" id={text(data.anchor, section.id)}><div className="lc-work__head"><SectionHeading data={data} />{data.ctaLabel ? <a href={text(data.ctaHref,'#')}>{text(data.ctaLabel)} <span>→</span></a> : null}</div><div className="lc-gallery">{items.map((item,index)=><figure className={`lc-gallery__item lc-gallery__item--${index+1}`} key={`${text(item.image)}-${index}`}><img src={text(item.image)} alt={text(item.alt,text(item.title))}/><figcaption><strong>{text(item.title)}</strong><span>{text(item.meta)}</span></figcaption></figure>)}</div></section>;
  }
  if (section.type === 'process') {
    const items = records(data.items);
    return <section className="lc-section lc-process" id={text(data.anchor,section.id)}><SectionHeading data={data}/><ol className="lc-process-list">{items.map((item,index)=><li key={`${text(item.title)}-${index}`}><span>0{index+1}</span><div><h3>{text(item.title)}</h3><p>{text(item.body)}</p></div></li>)}</ol></section>;
  }
  if (section.type === 'listings') {
    const items = records(data.items);
    return <section className="lc-section lc-listings" id={text(data.anchor,section.id)}><div className="lc-work__head"><SectionHeading data={data}/>{data.ctaLabel ? <a href={text(data.ctaHref,'#')}>{text(data.ctaLabel)} <span>→</span></a> : null}</div><div className="lc-listing-grid">{items.map((item,index)=><article className="lc-listing" key={`${text(item.title)}-${index}`}>{item.image ? <div className="lc-listing__image"><img src={text(item.image)} alt={text(item.title)}/>{item.status ? <span>{text(item.status)}</span> : null}</div> : null}<div className="lc-listing__copy"><h3>{text(item.title)}</h3><p>{text(item.location)}</p><div>{text(item.details)}</div></div></article>)}</div></section>;
  }
  if (section.type === 'cta') {
    return <section className="lc-section lc-cta" id={text(data.anchor,section.id)}>{data.eyebrow ? <p className="public-kicker">{text(data.eyebrow)}</p> : null}<h2>{text(data.heading)}</h2><p>{text(data.body)}</p><div className="lc-actions">{data.ctaLabel ? <a className="lc-btn lc-btn--dark" href={text(data.ctaHref,'#')}>{text(data.ctaLabel)}</a> : null}{data.secondaryLabel ? <a className="lc-text-link lc-text-link--dark" href={text(data.secondaryHref,'#')}>{text(data.secondaryLabel)}</a> : null}</div></section>;
  }
  return <section className="lc-section lc-generic"><SectionHeading data={data}/></section>;
}

export function CmsPageRenderer({ model, embedded=false, selectedSectionId, onSectionSelect }: {
  model: PublicPageModel;
  embedded?: boolean;
  selectedSectionId?: string;
  onSectionSelect?: (sectionId: string) => void;
}) {
  const tokens=model.theme?.tokens??{};
  const brand=String(tokens.brand??'#10110f');
  const surface=String(tokens.surface??'#f3f0e9');
  const themeStyle={'--site-brand':brand,'--site-surface':surface,'--ink':brand,'--paper':surface,'--muted':String(tokens.muted??'#77766f'),'--line':String(tokens.line??'rgba(16,17,15,.13)'),'--cream':String(tokens.secondarySurface??'#e8e2d5'),'--site-radius':`${Number(tokens.radius??18)}px`} as React.CSSProperties;
  return <main className={`public-site${embedded ? ' public-site--embedded' : ''}`} style={themeStyle}>
    {model.globalCmsNav ? <GlobalCmsHeader nav={model.globalCmsNav}/> : null}
    {model.sections.filter(section => section.visible !== false).map(section => <div key={section.id} className={`cms-render-section${selectedSectionId===section.id?' is-selected':''}`} onClick={embedded ? (event)=>{event.preventDefault();event.stopPropagation();onSectionSelect?.(section.id);} : undefined}><CmsSection section={section}/></div>)}
    {model.globalCmsNav ? <GlobalCmsFooter nav={model.globalCmsNav}/> : null}
  </main>;
}

export function PublicCmsPage({ siteKey, route='/' }:{ siteKey:string; route?:string }) {
  const [page,setPage]=useState<PublicPageModel|null>(null); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{ setPage(null); setError(null); fetch(`/api/public/sites/${encodeURIComponent(siteKey)}/page?route=${encodeURIComponent(route)}`).then(async r=>{ if(!r.ok) throw new Error(r.status===404?'This page has not been published yet.':'Could not load page.'); return r.json() as Promise<PublicPageModel>; }).then(data=>{setPage(data); if(data.page.seo.title) document.title=data.page.seo.title;}).catch((reason:Error)=>setError(reason.message)); },[route,siteKey]);
  if(error) return <main className="public-site public-site--state"><p className="public-kicker">Legendary OS · CMS</p><h1>{error}</h1><a href="/dashboard/cms">Open CMS</a></main>;
  if(!page) return <main className="public-site public-site--state"><p>Loading published site…</p></main>;
  return <CmsPageRenderer model={page}/>;
}
