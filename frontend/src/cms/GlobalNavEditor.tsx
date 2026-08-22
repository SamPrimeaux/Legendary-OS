import React, { useEffect, useState } from 'react';

type NavDraft = {
  brand: Record<string, unknown>;
  header: Record<string, unknown>;
  footer: Record<string, unknown>;
};

export function GlobalNavEditor({ siteId }: { siteId: string }) {
  const [draft, setDraft] = useState('');
  const [state, setState] = useState('Loading global navigation…');

  useEffect(() => {
    if (!siteId) return;
    setState('Loading global navigation…');
    fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/global-nav`)
      .then((response) => response.json())
      .then((payload) => {
        const nav = payload.globalCmsNav;
        const data: NavDraft = { brand: nav?.brand ?? {}, header: nav?.header ?? {}, footer: nav?.footer ?? {} };
        setDraft(JSON.stringify(data, null, 2));
        setState('D1 draft loaded');
      })
      .catch(() => setState('Could not load global navigation'));
  }, [siteId]);

  async function save() {
    try {
      setState('Saving to D1…');
      const data = JSON.parse(draft) as NavDraft;
      const response = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/global-nav`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data }),
      });
      if (!response.ok) throw new Error(await response.text());
      setState('Saved to D1');
      return true;
    } catch (error) {
      setState(error instanceof SyntaxError ? 'Invalid JSON' : 'Save failed');
      return false;
    }
  }

  async function publish() {
    try {
      if (!await save()) return;
      setState('Publishing to R2 + CMS_CACHE…');
      const response = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/global-nav/publish`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
      setState('Published globally');
    } catch {
      setState('Publish failed');
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <section className="iam-cms-card" style={{ padding: 18, maxWidth: 980, margin: '0 auto' }}>
        <p className="iam-cms-site-hero__suite">globalCmsNav</p>
        <h2 className="iam-cms-site-hero__name">Global header + footer</h2>
        <p className="iam-cms-site-hero__meta">One record per site. Draft lives in D1; Publish writes the global snapshot to R2 and moves the CMS_CACHE pointer.</p>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} style={{ width: '100%', minHeight: 430, marginTop: 18, padding: 14, border: '1px solid #e8e4dc', borderRadius: 12, font: '12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <button className="iam-cms-btn" onClick={save}>Save draft</button>
          <button className="iam-cms-btn iam-cms-btn--primary" onClick={publish}>Publish globally</button>
          <span style={{ fontSize: 11, color: '#6b6560' }}>{state}</span>
        </div>
      </section>
    </div>
  );
}
