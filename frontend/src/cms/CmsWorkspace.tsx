import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CmsPage, CmsSite } from '@legendary-os/iam-cms';
import { MediaWorkspace } from '../media';
import { GlobalNavEditor } from './GlobalNavEditor';
import { ThemeEditor } from './ThemeEditor';
import './iamShell.css';

type PreviewSection = {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  data: Record<string, unknown>;
  blocks: unknown[];
};

type Preview = {
  page: CmsPage & { sections: PreviewSection[] };
  theme: { tokens: Record<string, string | number> } | null;
};

type View = 'overview' | 'content' | 'navigation' | 'theme' | 'media' | 'templates';

export function CmsWorkspace() {
  const [sites, setSites] = useState<CmsSite[]>([]);
  const [siteId, setSiteId] = useState('');
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [pageId, setPageId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [view, setView] = useState<View>('overview');
  const [status, setStatus] = useState('Loading CMS…');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [agentDraft, setAgentDraft] = useState('');

  const loadSites = useCallback(() => {
    setStatus('Loading CMS…');
    fetch('/api/cms/sites')
      .then((r) => r.json())
      .then((data) => {
        const next: CmsSite[] = data.sites ?? [];
        setSites(next);
        setSiteId((current) => current || next[0]?.id || '');
        setStatus(next.length ? 'Connected · Cloudflare' : 'No sites configured');
      })
      .catch(() => setStatus('CMS unavailable'));
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  const loadPages = useCallback(() => {
    if (!siteId) return;
    setPreview(null);
    fetch(`/api/cms/sites/${siteId}/pages`)
      .then((r) => r.json())
      .then((data) => {
        const next: CmsPage[] = data.pages ?? [];
        setPages(next);
        setPageId((current) => next.some((p) => p.id === current) ? current : (next[0]?.id ?? ''));
      });
  }, [siteId]);

  useEffect(() => { loadPages(); }, [loadPages]);

  const loadPreview = useCallback(() => {
    if (!pageId) return;
    fetch(`/api/cms/pages/${pageId}/preview`)
      .then((r) => r.json())
      .then((data: Preview) => {
        setPreview(data);
        setSelectedSectionId((current) =>
          current && data.page.sections.some((s) => s.id === current)
            ? current
            : (data.page.sections[0]?.id ?? ''),
        );
      });
  }, [pageId]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const site = useMemo(() => sites.find((x) => x.id === siteId) ?? null, [sites, siteId]);
  const page = useMemo(() => pages.find((x) => x.id === pageId) ?? null, [pages, pageId]);
  const selectedSection = useMemo(
    () => preview?.page.sections.find((s) => s.id === selectedSectionId) ?? null,
    [preview, selectedSectionId],
  );
  const sections = preview?.page.sections ?? [];
  const drafts = pages.filter((p) => String(p.status).toLowerCase() !== 'published').length;

  async function saveField(sectionId: string, key: string, value: string) {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/cms/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: { [key]: value } }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveState('saved');
      loadPreview();
    } catch {
      setSaveState('error');
    }
  }

  async function createPage() {
    if (!siteId) return;
    const title = window.prompt('Page title');
    if (!title?.trim()) return;
    const route = window.prompt('Page route', `/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
    if (!route?.trim()) return;
    const response = await fetch(`/api/cms/sites/${siteId}/pages`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), route: route.trim(), pageType: 'standard' }),
    });
    if (!response.ok) { setSaveState('error'); return; }
    const payload = await response.json() as { page?: CmsPage };
    await loadPages();
    if (payload.page?.id) setPageId(payload.page.id);
  }

  async function addSection() {
    if (!pageId) return;
    const response = await fetch('/api/cms/section-schemas');
    const payload = await response.json() as { schemas?: Array<{ section_type: string; label: string }> };
    const schemas = payload.schemas ?? [];
    const suggested = schemas[0]?.section_type ?? 'content';
    const type = window.prompt(`Section type\n${schemas.map((item) => `${item.section_type} — ${item.label}`).join('\n')}`, suggested);
    if (!type?.trim()) return;
    const created = await fetch(`/api/cms/pages/${pageId}/sections`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: type.trim() }),
    });
    if (!created.ok) { setSaveState('error'); return; }
    const data = await created.json() as { section?: { id?: string } };
    setSaveState('saved');
    await loadPreview();
    if (data.section?.id) setSelectedSectionId(data.section.id);
  }

  async function removeSection() {
    if (!selectedSectionId || !window.confirm('Remove this section from the draft page?')) return;
    const response = await fetch(`/api/cms/sections/${selectedSectionId}`, { method: 'DELETE' });
    if (!response.ok) { setSaveState('error'); return; }
    setSelectedSectionId('');
    setSaveState('saved');
    loadPreview();
  }

  async function archivePage() {
    if (!pageId || !window.confirm('Archive this page? It will stop resolving as a live CMS route after the published pointer is removed in a later cleanup/publish action.')) return;
    const response = await fetch(`/api/cms/pages/${pageId}`, { method: 'DELETE' });
    if (!response.ok) { setSaveState('error'); return; }
    setPageId('');
    loadPages();
  }

  async function publish() {
    if (!pageId) return;
    setPublishState('publishing');
    try {
      const res = await fetch(`/api/cms/pages/${pageId}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      setPublishState('published');
    } catch {
      setPublishState('error');
    }
  }

  if (view !== 'overview') {
    return (
      <div className="iam-cms-shell iam-cms-editor">
        <header className="iam-cms-editor__top">
          <div className="iam-cms-editor__bar">
            <button className="iam-cms-editor__back" onClick={() => setView('overview')} aria-label="Back to CMS overview">←</button>
            <div className="iam-cms-editor__title">
              <strong>{site?.name ?? 'Legendary CMS'} · {page?.title ?? 'Page'}</strong>
              <small>{site?.domain ?? 'Legendary'}{page?.route ?? '/'}</small>
            </div>
            <span style={{ fontSize: 10, color: '#6b6560' }}>
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : ''}
            </span>
            <button className="iam-cms-editor__publish" onClick={publish} disabled={!pageId || publishState === 'publishing'}>
              {publishState === 'publishing' ? 'Publishing…' : publishState === 'published' ? 'Published' : 'Publish'}
            </button>
          </div>
          <nav className="iam-cms-editor__tabs">
            {(['content', 'navigation', 'theme', 'media', 'templates'] as View[]).map((item) => (
              <button key={item} className={`iam-cms-editor__tab${view === item ? ' active' : ''}`} onClick={() => setView(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
        </header>

        {view === 'media' ? (
          <MediaWorkspace embedded siteId={siteId} />
        ) : view === 'navigation' ? (
          <GlobalNavEditor siteId={siteId} />
        ) : view === 'theme' ? (
          <ThemeEditor siteId={siteId} />
        ) : view === 'content' ? (
          <div className="iam-cms-editor__body">
            <aside className="iam-cms-card iam-cms-editor__pages">
              <div className="iam-cms-editor__section-title">Pages</div>
              {pages.map((item) => (
                <button key={item.id} className={`iam-cms-page-row${item.id === pageId ? ' active' : ''}`} onClick={() => setPageId(item.id)}>
                  <strong>{item.title}</strong><small>{item.route}</small>
                </button>
              ))}
              <div className="iam-cms-editor__section-title" style={{ marginTop: 14 }}>Sections</div>
              <div className="iam-cms-editor__section-list">
                {sections.map((section) => (
                  <button key={section.id} className={`iam-cms-section-row${section.id === selectedSectionId ? ' active' : ''}`} onClick={() => setSelectedSectionId(section.id)}>
                    <strong>{section.name}</strong><small>{section.type} · {section.visible ? 'Visible' : 'Hidden'}</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="iam-cms-card iam-cms-preview-frame">
              <div className="iam-cms-browser">{site?.domain ?? 'preview.legendary.local'}{page?.route ?? '/'}</div>
              <div className="iam-cms-preview-surface">
                {sections.map((section) => (
                  <article key={section.id} className="iam-cms-preview-section" onClick={() => setSelectedSectionId(section.id)}>
                    {section.data.eyebrow ? <p className="eyebrow">{String(section.data.eyebrow)}</p> : null}
                    {section.data.heading ? <h2>{String(section.data.heading)}</h2> : null}
                    {section.data.body ? <p>{String(section.data.body)}</p> : null}
                    {section.data.ctaLabel ? <button>{String(section.data.ctaLabel)}</button> : null}
                  </article>
                ))}
              </div>
            </section>

            <aside className="iam-cms-card iam-cms-editor__properties">
              <div className="iam-cms-editor__section-title">Properties</div>
              {selectedSection ? Object.entries(selectedSection.data).map(([key, value]) => (
                <EditableField key={`${selectedSection.id}:${key}`} label={humanize(key)} value={String(value)} onSave={(next) => saveField(selectedSection.id, key, next)} />
              )) : <p style={{ color: '#6b6560', fontSize: 12 }}>Select a section to edit it.</p>}
            </aside>
          </div>
        ) : (
          <div style={{ padding: 18 }}>
            <section className="iam-cms-card" style={{ padding: 22 }}>
              <p className="iam-cms-site-hero__suite">{view}</p>
              <h2 className="iam-cms-site-hero__name">{view[0].toUpperCase() + view.slice(1)}</h2>
              <p className="iam-cms-site-hero__meta">IAM baseline surface copied in; this module is intentionally waiting for its focused isolation pass rather than inventing a second implementation.</p>
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="iam-cms-shell iam-cms-hub-page">
      <section className="iam-cms-guided-hero">
        <div className="iam-cms-guided-hero__copy">
          <p className="iam-cms-guided-hero__kicker">Legendary OS · CMS Suite</p>
          <h1 className="iam-cms-guided-hero__title">What do you want to change?</h1>
          <p className="iam-cms-guided-hero__sub">Manage Legendary’s websites directly or ask Agent Sam to help prepare the change.</p>
        </div>
        <div className="iam-cms-guided-hero__compose">
          <div className="iam-cms-guided-hero__compose-meta">
            <span className="iam-cms-guided-hero__agent-pill">Agent Sam</span>
            <span className="iam-cms-guided-hero__mode-pill">CMS context</span>
          </div>
          <div className="iam-cms-guided-hero__compose-row">
            <input className="iam-cms-guided-hero__input" value={agentDraft} onChange={(e) => setAgentDraft(e.target.value)} placeholder="Update the Scapes services page, publish a project, change homepage copy…" />
            <button className="iam-cms-guided-hero__send" title="Agent Sam SDK wiring comes next" onClick={() => setAgentDraft('')}>→</button>
          </div>
        </div>
      </section>

      <div className="iam-cms-hub-page__body">
        <div className="iam-cms-hub-page__toolbar">
          <div className="iam-cms-site-switcher">
            <button className="iam-cms-site-switcher__trigger">
              <span className="iam-cms-site-switcher__copy">
                <span className="iam-cms-site-switcher__eyebrow">Active website</span>
                <span className="iam-cms-site-switcher__label">{site?.name ?? 'Choose a website'}</span>
                <span className="iam-cms-site-switcher__hint">{site?.domain ?? 'Legendary'}</span>
              </span>
              <span>⌄</span>
            </button>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} aria-label="Choose website">
              {sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <button className="iam-cms-shell__nav-link" onClick={loadSites}>Refresh</button>
        </div>

        <div className="iam-cms-dashboard">
          <div className="iam-cms-dashboard__hero">
            <section className="iam-cms-card iam-cms-site-hero">
              <div className="iam-cms-site-hero__head">
                <div className="iam-cms-site-hero__identity">
                  <div className="iam-cms-site-mark">{initials(site?.name ?? 'Legendary')}</div>
                  <div>
                    <p className="iam-cms-site-hero__suite">Active site · CMS Suite</p>
                    <h2 className="iam-cms-site-hero__name">{site?.name ?? 'Legendary'}</h2>
                    <p className="iam-cms-site-hero__meta">{site?.domain ?? 'Connected through Legendary OS'} · {drafts} draft{drafts === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <span className="iam-cms-site-hero__live"><i />Live</span>
              </div>
              <div className="iam-cms-site-hero__stats">
                <Stat label="Pages" value={pages.length} />
                <Stat label="Sections" value={sections.length} />
                <Stat label="Drafts" value={drafts} />
                <Stat label="Agent" value="Ready" />
              </div>
              <div className="iam-cms-site-hero__actions">
                <button className="iam-cms-btn iam-cms-btn--primary" onClick={() => setView('content')}>Open CMS</button>
                <button className="iam-cms-btn" onClick={() => setView('content')}>Edit site</button>
                {site?.domain ? <a className="iam-cms-btn" href={`https://${site.domain.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>View site</a> : null}
              </div>
            </section>

            <div className="iam-cms-modules">
              <Module title="Content" desc="Create, organize, and publish pages and sections." sub={`${drafts} drafts`} cta="Manage content →" onClick={() => setView('content')} />
              <Module title="Media" desc="Images, videos, job photos, and site assets." sub="Media library" cta="Open media →" onClick={() => setView('media')} />
              <Module title="Theme" desc="Brand, typography, colors, and visual settings." sub="Site appearance" cta="Edit theme →" onClick={() => setView('theme')} />
              <Module title="Templates" desc="Reusable page and section patterns." sub="Reusable system" cta="Browse templates →" onClick={() => setView('templates')} />
            </div>
          </div>

          <div className="iam-cms-dashboard__grid">
            <section className="iam-cms-card">
              <div className="iam-cms-panel-head">Recent activity</div>
              <ul className="iam-cms-activity">
                <li><span className="iam-cms-activity__action">CMS connected to Legendary OS</span><span className="iam-cms-activity__when">Now</span></li>
                <li><span className="iam-cms-activity__action">{site?.name ?? 'Website'} loaded</span><span className="iam-cms-activity__when">Live</span></li>
                <li><span className="iam-cms-activity__action">{page?.title ?? 'Home'} ready to edit</span><span className="iam-cms-activity__when">Ready</span></li>
              </ul>
            </section>
            <section className="iam-cms-card">
              <div className="iam-cms-panel-head">Quick actions</div>
              <ul className="iam-cms-quick">
                <li><button onClick={() => setView('content')}>Edit homepage <span>→</span></button></li>
                <li><button onClick={() => setView('content')}>Manage pages <span>→</span></button></li>
                <li><button onClick={() => setView('media')}>Upload media <span>→</span></button></li>
                <li><button onClick={() => setView('theme')}>Site appearance <span>→</span></button></li>
              </ul>
            </section>
          </div>

          <div className="iam-cms-runtime">{status} · IAM CMS baseline isolated inside Legendary OS · normal editing remains available without Agent Sam.</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="iam-cms-stat"><div className="iam-cms-stat__label">{label}</div><div className="iam-cms-stat__value">{value}</div></div>;
}

function Module({ title, desc, sub, cta, onClick }: { title: string; desc: string; sub: string; cta: string; onClick: () => void }) {
  return <button className="iam-cms-card iam-cms-module" onClick={onClick}><h3 className="iam-cms-module__title">{title}</h3><p className="iam-cms-module__desc">{desc}</p><p className="iam-cms-module__sub">{sub}</p><span className="iam-cms-module__cta">{cta}</span></button>;
}

function EditableField({ label, value, onSave }: { label: string; value: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const long = value.length > 70;
  const commit = () => { if (draft !== value) onSave(draft); };
  return <label className="iam-cms-field"><span>{label}</span>{long ? <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} /> : <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />}</label>;
}

function humanize(value: string) { return value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()); }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'L'; }
