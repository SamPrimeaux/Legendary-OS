import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CmsPage, CmsSite } from '@legendary-os/iam-cms';
import { MediaWorkspace } from '../media';
import { MediaPicker } from '../media/components/MediaPicker';
import { mediaClient } from '../media/api/mediaClient';
import type { MediaAsset } from '../media/types';
import { CmsPageRenderer, type PublicPageModel } from '../site/PublicCmsPage';
import { GlobalNavEditor } from './GlobalNavEditor';
import { ThemeEditor } from './ThemeEditor';
import './iamShell.css';

type PreviewSection = {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  sortOrder: number;
  data: Record<string, unknown>;
  blocks: Array<Record<string, unknown>>;
};

type Preview = {
  page: CmsPage & { sections: PreviewSection[] };
  theme: { id:string; name:string; tokens: Record<string, string | number> } | null;
  globalCmsNav?: PublicPageModel['globalCmsNav'];
};

type RegistryField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: Array<{label:string;value:string}>;
};

type SectionSchema = {
  section_type: string;
  label: string;
  description?: string;
  schema?: { fields?: RegistryField[] };
};

type Revision = {
  id:string;
  kind:'draft'|'publish'|'restore';
  actorId?:string;
  actor_id?:string;
  createdAt?:number;
  created_at?:number;
};

type WhoAmI = { actorId:string; authMode:string; capabilities:string[] };
type View = 'overview' | 'content' | 'navigation' | 'theme' | 'media' | 'templates';

async function cmsJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const code = typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
    const message = typeof body.message === 'string' ? body.message : code;
    throw new Error(message);
  }
  return body as T;
}

export function CmsWorkspace() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [sites, setSites] = useState<CmsSite[]>([]);
  const [siteId, setSiteId] = useState(() => params.get('site') || window.localStorage.getItem('legendary.cms.site') || 'site_scapes');
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [pageId, setPageId] = useState(() => params.get('page') || '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [schemas, setSchemas] = useState<SectionSchema[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [view, setView] = useState<View>((params.get('view') as View) || 'overview');
  const [status, setStatus] = useState('Loading CMS…');
  const [error, setError] = useState('');
  const [whoami, setWhoami] = useState<WhoAmI | null>(null);
  const [siteSectionCount, setSiteSectionCount] = useState(0);
  const [dirtyPageIds, setDirtyPageIds] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [agentDraft, setAgentDraft] = useState('');

  const syncUrl = useCallback((next: {site?:string;page?:string;view?:View}) => {
    const query = new URLSearchParams(window.location.search);
    const values = { site: siteId, page: pageId, view, ...next };
    Object.entries(values).forEach(([key,value]) => value ? query.set(key,String(value)) : query.delete(key));
    window.history.replaceState(null,'',`${window.location.pathname}?${query.toString()}`);
  },[pageId,siteId,view]);

  const loadSites = useCallback(async () => {
    setStatus('Connecting to CMS…');
    setError('');
    try {
      const [sitePayload, identity, schemaPayload] = await Promise.all([
        cmsJson<{sites:CmsSite[]}>('/api/cms/sites'),
        cmsJson<WhoAmI>('/api/cms/whoami'),
        cmsJson<{schemas:SectionSchema[]}>('/api/cms/section-schemas'),
      ]);
      const next = sitePayload.sites ?? [];
      const desired = next.some(item => item.id === siteId) ? siteId : (next.find(item => item.id === 'site_scapes')?.id || next[0]?.id || '');
      setSites(next);
      setSiteId(desired);
      setWhoami(identity);
      setSchemas(schemaPayload.schemas ?? []);
      setStatus(next.length ? `Connected · ${identity.authMode}` : 'No sites configured');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'CMS unavailable';
      setError(message);
      setStatus(message === 'invalid_bridge_key' ? 'Identity adapter not connected' : 'CMS unavailable');
    }
  },[siteId]);

  useEffect(() => { void loadSites(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPages = useCallback(async () => {
    if (!siteId) return;
    setError('');
    try {
      const payload = await cmsJson<{pages:CmsPage[]}>(`/api/cms/sites/${encodeURIComponent(siteId)}/pages`);
      const next = payload.pages ?? [];
      setPages(next);
      const desired = next.some(item => item.id === pageId) ? pageId : (next.find(item => item.route === '/')?.id || next[0]?.id || '');
      setPageId(desired);
      const pageDetails = await Promise.all(next.map(async item => {
        const [draft, history] = await Promise.all([
          cmsJson<Preview>(`/api/cms/pages/${encodeURIComponent(item.id)}/preview`),
          cmsJson<{revisions:Revision[]}>(`/api/cms/pages/${encodeURIComponent(item.id)}/revisions`),
        ]);
        const ordered = [...(history.revisions ?? [])].sort((a,b) => revisionTime(b)-revisionTime(a));
        const latestChange = ordered.find(revision => revision.kind === 'draft' || revision.kind === 'restore');
        const latestPublish = ordered.find(revision => revision.kind === 'publish');
        return { sections:draft.page.sections.length, dirty:Boolean(latestChange && (!latestPublish || revisionTime(latestChange)>revisionTime(latestPublish))), id:item.id };
      }));
      setSiteSectionCount(pageDetails.reduce((sum,item)=>sum+item.sections,0));
      setDirtyPageIds(new Set(pageDetails.filter(item=>item.dirty).map(item=>item.id)));
      setStatus(`Connected · ${whoami?.authMode || 'CMS'}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load pages');
    }
  },[pageId,siteId,whoami?.authMode]);

  useEffect(() => { void loadPages(); }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPreview = useCallback(async () => {
    if (!pageId) { setPreview(null); setRevisions([]); return; }
    try {
      const [draft, history] = await Promise.all([
        cmsJson<Preview>(`/api/cms/pages/${encodeURIComponent(pageId)}/preview`),
        cmsJson<{revisions:Revision[]}>(`/api/cms/pages/${encodeURIComponent(pageId)}/revisions`),
      ]);
      setPreview(draft);
      setRevisions([...(history.revisions ?? [])].sort((a,b)=>revisionTime(b)-revisionTime(a)));
      setSelectedSectionId(current => current && draft.page.sections.some(section=>section.id===current) ? current : (draft.page.sections[0]?.id || ''));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load preview');
    }
  },[pageId]);

  useEffect(() => { void loadPreview(); syncUrl({page:pageId}); }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if(siteId){ window.localStorage.setItem('legendary.cms.site',siteId); syncUrl({site:siteId,page:''}); } }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { syncUrl({view}); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const site = useMemo(() => sites.find(item=>item.id===siteId) ?? null,[sites,siteId]);
  const page = useMemo(() => pages.find(item=>item.id===pageId) ?? null,[pages,pageId]);
  const selectedSection = useMemo(() => preview?.page.sections.find(section=>section.id===selectedSectionId) ?? null,[preview,selectedSectionId]);
  const schema = useMemo(() => schemas.find(item=>item.section_type===selectedSection?.type) ?? null,[schemas,selectedSection?.type]);
  const sections = preview?.page.sections ?? [];
  const previewModel = useMemo<PublicPageModel | null>(() => {
    if (!preview || !site) return null;
    const draftPage = preview.page;
    const rawSite = site as CmsSite & {brand_id?:string};
    return {
      site:{id:site.id,brandId:site.brandId || rawSite.brand_id || 'scapes',name:site.name,domain:site.domain || null},
      page:{id:draftPage.id,title:draftPage.title,route:draftPage.route,pageType:draftPage.pageType,status:draftPage.status,seo:{title:draftPage.seoTitle || null,description:draftPage.seoDescription || null}},
      sections:draftPage.sections,
      theme:preview.theme,
      globalCmsNav:preview.globalCmsNav,
    };
  },[preview,site]);

  async function savePageField(key:'title'|'route'|'seoTitle'|'seoDescription',value:string) {
    if(!pageId) return;
    setSaveState('saving');
    try {
      await cmsJson(`/api/cms/pages/${encodeURIComponent(pageId)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({[key]:value})});
      markDirty(pageId); setSaveState('saved'); await Promise.all([loadPages(),loadPreview()]);
    } catch(reason) { setSaveState('error'); setError(errorText(reason)); }
  }

  async function saveSection(sectionId:string,patch:Record<string,unknown>) {
    setSaveState('saving');
    try {
      await cmsJson(`/api/cms/sections/${encodeURIComponent(sectionId)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(patch)});
      markDirty(pageId); setSaveState('saved'); await loadPreview();
    } catch(reason) { setSaveState('error'); setError(errorText(reason)); }
  }

  async function saveField(sectionId:string,key:string,value:unknown) {
    await saveSection(sectionId,{data:{[key]:value}});
  }

  function markDirty(id:string) { setDirtyPageIds(current=>new Set([...current,id])); setPublishState('idle'); }

  async function createPage() {
    if(!siteId) return;
    const title=window.prompt('Page title'); if(!title?.trim()) return;
    const route=window.prompt('Page route',`/${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`); if(!route?.trim()) return;
    try {
      const result=await cmsJson<{page:CmsPage}>(`/api/cms/sites/${encodeURIComponent(siteId)}/pages`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:title.trim(),route:route.trim(),pageType:'standard'})});
      await loadPages(); setPageId(result.page.id); setView('content');
    } catch(reason) { setError(errorText(reason)); }
  }

  async function addSection() {
    if(!pageId) return;
    const choices=schemas.map(item=>`${item.section_type} — ${item.label}`).join('\n');
    const type=window.prompt(`Section type\n${choices}`,schemas[0]?.section_type || 'content'); if(!type?.trim()) return;
    try {
      const result=await cmsJson<{section:{id:string}}>(`/api/cms/pages/${encodeURIComponent(pageId)}/sections`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:type.trim()})});
      markDirty(pageId); await loadPreview(); setSelectedSectionId(result.section.id);
    } catch(reason) { setError(errorText(reason)); }
  }

  async function removeSection() {
    if(!selectedSectionId || !window.confirm('Remove this section from the draft? Production remains unchanged until publish.')) return;
    try {
      await cmsJson(`/api/cms/sections/${encodeURIComponent(selectedSectionId)}`,{method:'DELETE'});
      markDirty(pageId); setSelectedSectionId(''); await loadPreview();
    } catch(reason) { setError(errorText(reason)); }
  }

  async function moveSection(direction:-1|1) {
    if(!selectedSection) return;
    const ordered=[...sections].sort((a,b)=>a.sortOrder-b.sortOrder);
    const index=ordered.findIndex(item=>item.id===selectedSection.id);
    const other=ordered[index+direction]; if(!other) return;
    try {
      await Promise.all([
        saveSection(selectedSection.id,{sortOrder:other.sortOrder}),
        saveSection(other.id,{sortOrder:selectedSection.sortOrder}),
      ]);
      await loadPreview();
    } catch(reason) { setError(errorText(reason)); }
  }

  async function publish() {
    if(!pageId) return;
    setPublishState('publishing'); setError('');
    try {
      const result=await cmsJson<{verification?:{ok:boolean;route:string}}>(`/api/cms/pages/${encodeURIComponent(pageId)}/publish`,{method:'POST'});
      if(!result.verification?.ok) throw new Error('Publication could not be verified');
      setDirtyPageIds(current=>{const next=new Set(current);next.delete(pageId);return next;});
      setPublishState('published'); setStatus(`Published and verified · ${result.verification.route}`);
      await Promise.all([loadPages(),loadPreview()]);
    } catch(reason) { setPublishState('error'); setError(errorText(reason)); }
  }

  async function restoreRevision(revisionId:string,live:boolean) {
    const action=live?'roll back the live page':'restore this version into the draft';
    if(!window.confirm(`Are you sure you want to ${action}?`)) return;
    setPublishState(live?'publishing':'idle'); setError('');
    try {
      const endpoint=live?'rollback':'restore';
      await cmsJson(`/api/cms/revisions/${encodeURIComponent(revisionId)}/${endpoint}`,{method:'POST'});
      if(live){setDirtyPageIds(current=>{const next=new Set(current);next.delete(pageId);return next;});setPublishState('published');setStatus('Live rollback verified');}
      else {markDirty(pageId);setSaveState('saved');}
      await Promise.all([loadPages(),loadPreview()]);
    } catch(reason) { setPublishState('error'); setError(errorText(reason)); }
  }

  if(error && !sites.length) {
    return <div className="iam-cms-shell iam-cms-blocked"><section className="iam-cms-card"><p className="iam-cms-site-hero__suite">Legendary OS · CMS</p><h1>CMS connection needs attention</h1><p>{error}</p><button className="iam-cms-btn iam-cms-btn--primary" onClick={()=>void loadSites()}>Retry connection</button></section></div>;
  }

  if(view!=='overview') {
    return <div className="iam-cms-shell iam-cms-editor">
      <header className="iam-cms-editor__top">
        <div className="iam-cms-editor__bar">
          <button className="iam-cms-editor__back" onClick={()=>setView('overview')} aria-label="Back to CMS overview">←</button>
          <div className="iam-cms-editor__title"><strong>{site?.name ?? 'Legendary CMS'} · {page?.title ?? 'Page'}</strong><small>{publicHref(siteId,page?.route || '/')}</small></div>
          <span className="iam-cms-save-indicator">{saveState==='saving'?'Saving…':saveState==='saved'?'Saved':saveState==='error'?'Save failed':dirtyPageIds.has(pageId)?'Draft changed':''}</span>
          <a className="iam-cms-btn iam-cms-editor__view-live" href={publicHref(siteId,page?.route || '/')} target="_blank" rel="noreferrer">View live</a>
          <button className="iam-cms-editor__publish" onClick={()=>void publish()} disabled={!pageId||publishState==='publishing'}>{publishState==='publishing'?'Publishing…':publishState==='published'?'Published ✓':'Publish'}</button>
        </div>
        <nav className="iam-cms-editor__tabs">{(['content','navigation','theme','media','templates'] as View[]).map(item=><button key={item} className={`iam-cms-editor__tab${view===item?' active':''}`} onClick={()=>setView(item)}>{humanize(item)}</button>)}</nav>
        {error?<div className="iam-cms-error">{error}</div>:null}
      </header>

      {view==='media'?<MediaWorkspace embedded siteId={siteId}/>:view==='navigation'?<GlobalNavEditor siteId={siteId}/>:view==='theme'?<ThemeEditor siteId={siteId}/>:view==='content'?(
        <div className="iam-cms-editor__body">
          <aside className="iam-cms-card iam-cms-editor__pages">
            <div className="iam-cms-editor__section-title">Pages</div>
            <button className="iam-cms-btn iam-cms-small-action" onClick={()=>void createPage()}>+ New page</button>
            {pages.map(item=><button key={item.id} className={`iam-cms-page-row${item.id===pageId?' active':''}`} onClick={()=>setPageId(item.id)}><strong>{item.title}{dirtyPageIds.has(item.id)?<i className="iam-cms-dirty-dot"/>:null}</strong><small>{item.route}</small></button>)}
            <div className="iam-cms-editor__section-title iam-cms-section-title-spaced">Sections</div>
            <div className="iam-cms-section-actions"><button onClick={()=>void addSection()}>+</button><button onClick={()=>void moveSection(-1)} disabled={!selectedSection}>↑</button><button onClick={()=>void moveSection(1)} disabled={!selectedSection}>↓</button><button onClick={()=>void removeSection()} disabled={!selectedSection}>−</button></div>
            <div className="iam-cms-editor__section-list">{sections.sort((a,b)=>a.sortOrder-b.sortOrder).map(section=><button key={section.id} className={`iam-cms-section-row${section.id===selectedSectionId?' active':''}`} onClick={()=>setSelectedSectionId(section.id)}><strong>{section.name}</strong><small>{section.type} · {section.visible?'Visible':'Hidden'}</small></button>)}</div>
          </aside>

          <section className="iam-cms-card iam-cms-preview-frame">
            <div className="iam-cms-browser"><span>Draft preview</span><strong>{publicHref(siteId,page?.route || '/')}</strong></div>
            <div className="iam-cms-exact-preview">{previewModel?<CmsPageRenderer model={previewModel} embedded selectedSectionId={selectedSectionId} onSectionSelect={setSelectedSectionId}/>:<p className="iam-cms-loading">Loading exact preview…</p>}</div>
          </section>

          <aside className="iam-cms-card iam-cms-editor__properties">
            <div className="iam-cms-editor__section-title">Page settings</div>
            {page?<><EditableField label="Title" value={page.title} onSave={value=>savePageField('title',value)}/><EditableField label="Route" value={page.route} onSave={value=>savePageField('route',value)}/><EditableField label="SEO title" value={page.seoTitle || ''} onSave={value=>savePageField('seoTitle',value)}/><EditableField label="SEO description" value={page.seoDescription || ''} multiline onSave={value=>savePageField('seoDescription',value)}/></>:null}
            <div className="iam-cms-editor__section-title iam-cms-section-title-spaced">Section properties</div>
            {selectedSection?<><div className="iam-cms-section-meta"><strong>{schema?.label || selectedSection.name}</strong><label><input type="checkbox" checked={selectedSection.visible} onChange={event=>void saveSection(selectedSection.id,{visible:event.target.checked})}/> Visible</label></div>{(schema?.schema?.fields || inferFields(selectedSection.data)).map(field=><SchemaField key={`${selectedSection.id}:${field.key}`} field={field} value={selectedSection.data[field.key]} siteId={siteId} pageId={pageId} sectionId={selectedSection.id} onSave={value=>saveField(selectedSection.id,field.key,value)}/>)}</>:<p className="iam-cms-muted">Select a section to edit it.</p>}
            <div className="iam-cms-editor__section-title iam-cms-section-title-spaced">Revision history</div>
            <div className="iam-cms-history">{revisions.slice(0,10).map(revision=><article key={revision.id}><div><strong>{humanize(revision.kind)}</strong><small>{formatTime(revisionTime(revision))} · {revision.actorId || revision.actor_id || 'system'}</small></div><div><button onClick={()=>void restoreRevision(revision.id,false)}>Draft</button><button onClick={()=>void restoreRevision(revision.id,true)}>Live</button></div></article>)}</div>
          </aside>
        </div>
      ):(
        <div className="iam-cms-placeholder"><section className="iam-cms-card"><p className="iam-cms-site-hero__suite">{view}</p><h2>{humanize(view)}</h2><p>This surface stays intentionally small until its reusable contract is needed. Content, media, navigation, theme, preview, publishing and rollback are already independent of Agent Sam.</p></section></div>
      )}
    </div>;
  }

  const dirtyCount=dirtyPageIds.size;
  return <div className="iam-cms-shell iam-cms-hub-page">
    <section className="iam-cms-guided-hero">
      <div className="iam-cms-guided-hero__copy"><p className="iam-cms-guided-hero__kicker">Legendary OS · CMS Suite</p><h1 className="iam-cms-guided-hero__title">What do you want to change?</h1><p className="iam-cms-guided-hero__sub">The complete manual CMS works now. Agent Sam identity and assisted change sets will bolt onto this shell when the SDK is ready.</p></div>
      <div className="iam-cms-guided-hero__compose"><div className="iam-cms-guided-hero__compose-meta"><span className="iam-cms-guided-hero__agent-pill">Agent Sam</span><span className="iam-cms-guided-hero__mode-pill">Identity adapter pending</span></div><div className="iam-cms-guided-hero__compose-row"><input className="iam-cms-guided-hero__input" value={agentDraft} onChange={event=>setAgentDraft(event.target.value)} placeholder="Update the Scapes services page, publish a project, change homepage copy…"/><button className="iam-cms-guided-hero__send" title="Enabled after AgentSam Identity is connected" disabled>→</button></div></div>
    </section>
    <div className="iam-cms-hub-page__body">
      <div className="iam-cms-hub-page__toolbar"><div className="iam-cms-site-switcher"><button className="iam-cms-site-switcher__trigger"><span className="iam-cms-site-switcher__copy"><span className="iam-cms-site-switcher__eyebrow">Active website</span><span className="iam-cms-site-switcher__label">{site?.name || 'Choose a website'}</span><span className="iam-cms-site-switcher__hint">{siteId==='site_scapes'?'/scapes':site?.domain || 'Legendary'}</span></span><span>⌄</span></button><select value={siteId} onChange={event=>setSiteId(event.target.value)} aria-label="Choose website">{sites.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button className="iam-cms-shell__nav-link" onClick={()=>void loadSites()}>Refresh</button></div>
      {error?<div className="iam-cms-error">{error}</div>:null}
      <div className="iam-cms-dashboard">
        <div className="iam-cms-dashboard__hero">
          <section className="iam-cms-card iam-cms-site-hero">
            <div className="iam-cms-site-hero__head"><div className="iam-cms-site-hero__identity"><div className="iam-cms-site-mark">{initials(site?.name || 'Legendary')}</div><div><p className="iam-cms-site-hero__suite">Active site · CMS Suite</p><h2 className="iam-cms-site-hero__name">{site?.name || 'Legendary'}</h2><p className="iam-cms-site-hero__meta">{siteId==='site_scapes'?'/scapes':site?.domain || 'Legendary'} · {dirtyCount} unpublished page{dirtyCount===1?'':'s'}</p></div></div><span className="iam-cms-site-hero__live"><i/>Live</span></div>
            <div className="iam-cms-site-hero__stats"><Stat label="Pages" value={pages.length}/><Stat label="Sections" value={siteSectionCount}/><Stat label="Unpublished" value={dirtyCount}/><Stat label="Identity" value={whoami?.authMode==='open-shell'?'Open shell':'Connected'}/></div>
            <div className="iam-cms-site-hero__actions"><button className="iam-cms-btn iam-cms-btn--primary" onClick={()=>setView('content')}>Open CMS</button><button className="iam-cms-btn" onClick={()=>setView('media')}>Open media</button><a className="iam-cms-btn" href={publicHref(siteId,'/')} target="_blank" rel="noreferrer">View site</a></div>
          </section>
          <div className="iam-cms-modules"><Module title="Content" desc="Edit and publish every page and section." sub={`${dirtyCount} unpublished`} cta="Manage content →" onClick={()=>setView('content')}/><Module title="Media" desc="Use the existing canonical asset library." sub="87+ managed assets" cta="Open media →" onClick={()=>setView('media')}/><Module title="Theme" desc="Brand colors and site appearance." sub="Published separately" cta="Edit theme →" onClick={()=>setView('theme')}/><Module title="Navigation" desc="Header, footer and public page links." sub="Global site chrome" cta="Edit navigation →" onClick={()=>setView('navigation')}/></div>
        </div>
        <div className="iam-cms-dashboard__grid"><section className="iam-cms-card"><div className="iam-cms-panel-head">Pages ready to edit</div><ul className="iam-cms-activity">{pages.map(item=><li key={item.id}><button onClick={()=>{setPageId(item.id);setView('content')}}><span className="iam-cms-activity__action">{item.title}</span><span className="iam-cms-activity__when">{dirtyPageIds.has(item.id)?'Draft changed':item.route}</span></button></li>)}</ul></section><section className="iam-cms-card"><div className="iam-cms-panel-head">Safe publishing loop</div><ul className="iam-cms-quick"><li><button onClick={()=>setView('content')}>Edit draft <span>→</span></button></li><li><button onClick={()=>setView('content')}>Preview exact page <span>→</span></button></li><li><button onClick={()=>setView('content')}>Publish and verify <span>→</span></button></li><li><button onClick={()=>setView('content')}>Restore or roll back <span>→</span></button></li></ul></section></div>
        <div className="iam-cms-runtime">{status} · actor {whoami?.actorId || 'connecting'} · OAuth becomes the door by replacing the identity adapter, not the CMS.</div>
      </div>
    </div>
  </div>;
}

function SchemaField({field,value,siteId,pageId,sectionId,onSave}:{field:RegistryField;value:unknown;siteId:string;pageId:string;sectionId:string;onSave:(value:unknown)=>void|Promise<void>}) {
  if(field.type==='image') return <ImageField label={field.label} value={String(value || '')} siteId={siteId} pageId={pageId} sectionId={sectionId} role={field.key} onSave={onSave}/>;
  if(Array.isArray(value) || field.type==='json' || field.type==='images') return <ArrayField label={field.label} value={Array.isArray(value)?value:[]} siteId={siteId} pageId={pageId} sectionId={sectionId} role={field.key} onSave={onSave}/>;
  if(field.type==='boolean') return <label className="iam-cms-checkbox"><input type="checkbox" checked={Boolean(value)} onChange={event=>void onSave(event.target.checked)}/>{field.label}</label>;
  return <EditableField label={field.label} value={value == null ? '' : String(value)} multiline={field.type==='textarea'||field.type==='richtext'} onSave={onSave}/>;
}

function ImageField({label,value,siteId,pageId,sectionId,role,onSave}:{label:string;value:string;siteId:string;pageId:string;sectionId:string;role:string;onSave:(value:unknown)=>void|Promise<void>}) {
  const [open,setOpen]=useState(false);
  const choose=async(asset:MediaAsset|null)=>{if(!asset){await onSave('');return;}await mediaClient.addUsage(asset.id,{siteId,pageId,sectionId,role,altText:asset.altText || asset.filename});await onSave(asset.delivery.publicUrl || asset.delivery.originalUrl);};
  return <div className="iam-cms-media-field"><span>{label}</span>{value?<img src={value} alt="Selected asset"/>:<div className="iam-cms-media-empty">No image selected</div>}<div><button onClick={()=>setOpen(true)}>Choose image</button>{value?<button onClick={()=>void onSave('')}>Remove</button>:null}</div><MediaPicker open={open} siteId={siteId} onChange={asset=>void choose(asset)} onClose={()=>setOpen(false)}/></div>;
}

function ArrayField({label,value,siteId,pageId,sectionId,role,onSave}:{label:string;value:unknown[];siteId:string;pageId:string;sectionId:string;role:string;onSave:(value:unknown)=>void|Promise<void>}) {
  const [items,setItems]=useState<unknown[]>(value); useEffect(()=>setItems(value),[value]);
  const commit=(next:unknown[])=>{setItems(next);void onSave(next);};
  const move=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=items.length)return;const next=[...items];[next[index],next[target]]=[next[target],next[index]];commit(next);};
  const add=()=>commit([...items,items.some(item=>typeof item==='object')?{title:'New item',body:''}:'New item']);
  return <div className="iam-cms-array-field"><div className="iam-cms-array-head"><span>{label}</span><button onClick={add}>+ Add</button></div>{items.map((item,index)=>typeof item==='object'&&item!==null?<ObjectArrayItem key={index} item={item as Record<string,unknown>} index={index} siteId={siteId} pageId={pageId} sectionId={sectionId} role={role} onChange={next=>{const copy=[...items];copy[index]=next;commit(copy)}} onRemove={()=>commit(items.filter((_,i)=>i!==index))} onMove={direction=>move(index,direction)}/>:<div className="iam-cms-array-row" key={index}><input value={String(item??'')} onChange={event=>{const copy=[...items];copy[index]=event.target.value;setItems(copy)}} onBlur={()=>void onSave(items)}/><button onClick={()=>move(index,-1)}>↑</button><button onClick={()=>move(index,1)}>↓</button><button onClick={()=>commit(items.filter((_,i)=>i!==index))}>×</button></div>)}</div>;
}

function ObjectArrayItem({item,index,siteId,pageId,sectionId,role,onChange,onRemove,onMove}:{item:Record<string,unknown>;index:number;siteId:string;pageId:string;sectionId:string;role:string;onChange:(item:Record<string,unknown>)=>void;onRemove:()=>void;onMove:(direction:-1|1)=>void}) {
  const keys=Object.keys(item);
  return <article className="iam-cms-repeater-card"><header><strong>Item {index+1}</strong><div><button onClick={()=>onMove(-1)}>↑</button><button onClick={()=>onMove(1)}>↓</button><button onClick={onRemove}>×</button></div></header>{keys.map(key=>key.toLowerCase().includes('image')?<ImageField key={key} label={humanize(key)} value={String(item[key]||'')} siteId={siteId} pageId={pageId} sectionId={sectionId} role={`${role}.${index}.${key}`} onSave={value=>onChange({...item,[key]:value})}/>:<EditableField key={key} label={humanize(key)} value={String(item[key]??'')} multiline={key==='body'||key==='details'} onSave={value=>onChange({...item,[key]:value})}/>)}</article>;
}

function EditableField({label,value,multiline=false,onSave}:{label:string;value:string;multiline?:boolean;onSave:(value:string)=>void|Promise<void>}) {
  const [draft,setDraft]=useState(value); useEffect(()=>setDraft(value),[value]);
  const commit=()=>{if(draft!==value)void onSave(draft);};
  return <label className="iam-cms-field"><span>{label}</span>{multiline||value.length>70?<textarea value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commit}/>:<input value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commit}/>}</label>;
}

function Stat({label,value}:{label:string;value:string|number}){return <div className="iam-cms-stat"><div className="iam-cms-stat__label">{label}</div><div className="iam-cms-stat__value">{value}</div></div>;}
function Module({title,desc,sub,cta,onClick}:{title:string;desc:string;sub:string;cta:string;onClick:()=>void}){return <button className="iam-cms-card iam-cms-module" onClick={onClick}><h3 className="iam-cms-module__title">{title}</h3><p className="iam-cms-module__desc">{desc}</p><p className="iam-cms-module__sub">{sub}</p><span className="iam-cms-module__cta">{cta}</span></button>;}
function inferFields(data:Record<string,unknown>):RegistryField[]{return Object.keys(data).map(key=>({key,label:humanize(key),type:Array.isArray(data[key])?'json':key.toLowerCase().includes('image')?'image':String(data[key]??'').length>70?'textarea':'text'}));}
function revisionTime(revision:Revision){return Number(revision.createdAt ?? revision.created_at ?? 0);}
function formatTime(value:number){return value?new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value)):'Unknown time';}
function publicHref(siteId:string,route:string){const suffix=route==='/'?'':route;return siteId==='site_scapes'?'/scapes'+suffix:suffix||'/';}
function errorText(reason:unknown){return reason instanceof Error?reason.message:'Unknown CMS error';}
function humanize(value:string){return value.replace(/([A-Z])/g,' $1').replace(/[-_]/g,' ').replace(/^./,character=>character.toUpperCase());}
function initials(value:string){return value.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'L';}
