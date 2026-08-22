import React, { useEffect, useMemo, useState } from 'react';
import type { CmsPage, CmsSite } from '@legendary-os/iam-cms';
import './cms.css';

type PreviewSection = { id: string; name: string; type: string; visible: boolean; data: Record<string, unknown>; blocks: unknown[] };
type Preview = {
  page: CmsPage & { sections: PreviewSection[] };
  theme: { tokens: Record<string, string | number> } | null;
};

export function CmsWorkspace() {
  const [sites, setSites] = useState<CmsSite[]>([]);
  const [siteId, setSiteId] = useState('');
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [pageId, setPageId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState('Loading CMS…');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/cms/sites').then((r) => r.json()).then((data) => {
      const next = data.sites ?? [];
      setSites(next);
      setSiteId(next[0]?.id ?? '');
      setStatus(next.length ? 'Ready' : 'No sites configured');
    }).catch(() => setStatus('CMS unavailable'));
  }, []);

  useEffect(() => {
    if (!siteId) return;
    setPreview(null);
    fetch(`/api/cms/sites/${siteId}/pages`).then((r) => r.json()).then((data) => {
      const next = data.pages ?? [];
      setPages(next);
      setPageId(next[0]?.id ?? '');
    });
  }, [siteId]);

  const loadPreview = React.useCallback(() => {
    if (!pageId) return;
    fetch(`/api/cms/pages/${pageId}/preview`).then((r) => r.json()).then((data: Preview) => {
      setPreview(data);
      setSelectedSectionId((current) =>
        current && data.page.sections.some((s) => s.id === current) ? current : (data.page.sections[0]?.id ?? ''),
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

  return (
    <div className="cms-shell">
      <aside className="cms-sidebar">
        <div className="cms-brand">
          <span className="cms-mark">L</span>
          <div><strong>Legendary OS</strong><small>Websites</small></div>
        </div>

        <label className="cms-label">Website</label>
        <select value={siteId} onChange={(event) => setSiteId(event.target.value)}>
          {sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>

        <div className="cms-nav-heading">Pages</div>
        <nav className="cms-pages">
          {pages.map((item) => (
            <button key={item.id} className={item.id === pageId ? 'active' : ''} onClick={() => setPageId(item.id)}>
              <span>{item.title}</span><small>{item.route}</small>
            </button>
          ))}
        </nav>

        <div className="cms-sidebar-foot">
          <span className="cms-dot" /> {status}
        </div>
      </aside>

      <main className="cms-main">
        <header className="cms-toolbar">
          <div>
            <span className="cms-kicker">{site?.name ?? 'Website'}</span>
            <h1>{page?.title ?? 'Page'}</h1>
          </div>
          <div className="cms-actions">
            <span className="cms-save-indicator">
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : ''}
            </span>
            <button className="secondary" onClick={loadPreview}>Refresh preview</button>
            <button className="primary" onClick={publish} disabled={!pageId || publishState === 'publishing'}>
              {publishState === 'publishing' ? 'Publishing…' : publishState === 'published' ? 'Published' : 'Publish'}
            </button>
          </div>
        </header>

        <div className="cms-workarea">
          <section className="cms-outline">
            <div className="cms-panel-title"><span>Structure</span><button title="Adding sections is not available yet">+</button></div>
            {preview?.page.sections.map((section) => (
              <button
                className={`cms-section-row${section.id === selectedSectionId ? ' active' : ''}`}
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
              >
                <span className="cms-grip">⋮⋮</span>
                <span><strong>{section.name}</strong><small>{section.type}</small></span>
                <span className="cms-visible">{section.visible ? 'On' : 'Off'}</span>
              </button>
            ))}
          </section>

          <section className="cms-canvas">
            <div className="cms-browser-bar">
              <span className="cms-browser-dots">● ● ●</span>
              <span>{site?.domain ?? 'preview.legendary.local'}{page?.route ?? '/'}</span>
            </div>
            <div className="cms-preview" style={{ '--cms-brand': String(preview?.theme?.tokens.brand ?? '#111111'), '--cms-surface': String(preview?.theme?.tokens.surface ?? '#f4f1ea') } as React.CSSProperties}>
              {preview?.page.sections.map((section) => (
                <article key={section.id} className={`cms-render cms-render-${section.type}`}>
                  {section.data.eyebrow ? <p className="eyebrow">{String(section.data.eyebrow)}</p> : null}
                  {section.data.heading ? <h2>{String(section.data.heading)}</h2> : null}
                  {section.data.body ? <p>{String(section.data.body)}</p> : null}
                  {section.data.ctaLabel ? <button>{String(section.data.ctaLabel)}</button> : null}
                </article>
              ))}
            </div>
          </section>

          <aside className="cms-inspector">
            <div className="cms-panel-title">Properties</div>
            {selectedSection ? Object.entries(selectedSection.data).map(([key, value]) => (
              <EditableField
                key={`${selectedSection.id}:${key}`}
                label={humanize(key)}
                value={String(value)}
                onSave={(next) => saveField(selectedSection.id, key, next)}
              />
            )) : <p className="cms-muted">Select a section to edit it.</p>}
          </aside>
        </div>
      </main>
    </div>
  );
}

function EditableField({ label, value, onSave }: { label: string; value: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const long = value.length > 70;
  const commit = () => { if (draft !== value) onSave(draft); };
  return (
    <label className="cms-field">
      <span>{label}</span>
      {long
        ? <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
        : <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />}
    </label>
  );
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
