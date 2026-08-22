import React, { useEffect, useState } from 'react';

type ThemeDraft = {
  name: string;
  tokens: Record<string, string | number>;
};

export function ThemeEditor({ siteId }: { siteId: string }) {
  const [draft, setDraft] = useState('');
  const [state, setState] = useState('Loading theme…');

  useEffect(() => {
    if (!siteId) return;
    setState('Loading theme…');
    fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/theme`)
      .then((response) => response.json())
      .then((payload) => {
        const theme = payload.theme;
        setDraft(JSON.stringify({ name: theme?.name ?? 'Site theme', tokens: theme?.tokens ?? {} } satisfies ThemeDraft, null, 2));
        setState('D1 draft loaded');
      })
      .catch(() => setState('Could not load theme'));
  }, [siteId]);

  async function save() {
    try {
      setState('Saving to D1…');
      const data = JSON.parse(draft) as ThemeDraft;
      const response = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/theme`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
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
    if (!await save()) return;
    try {
      setState('Publishing theme to R2 + CMS_CACHE…');
      const response = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/theme/publish`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
      setState('Theme published globally');
    } catch {
      setState('Publish failed');
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <section className="iam-cms-card" style={{ padding: 18, maxWidth: 980, margin: '0 auto' }}>
        <p className="iam-cms-site-hero__suite">cms_themes</p>
        <h2 className="iam-cms-site-hero__name">Global theme tokens</h2>
        <p className="iam-cms-site-hero__meta">Draft tokens live in D1. Publish writes an immutable R2 theme snapshot and moves the CMS_CACHE theme pointer for every page on this site.</p>
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
