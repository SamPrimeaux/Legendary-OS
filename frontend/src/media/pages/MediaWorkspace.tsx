import React, { useEffect, useRef, useState } from 'react';
import { mediaClient } from '../api/mediaClient';
import { MediaAssetDetail } from '../components/MediaAssetDetail';
import { MediaGrid } from '../components/MediaGrid';
import { MediaSourceTabs } from '../components/MediaSourceTabs';
import { MediaToolbar } from '../components/MediaToolbar';
import { MediaUpload } from '../components/MediaUpload';
import { useMediaAsset } from '../hooks/useMediaAsset';
import { useMediaAssets } from '../hooks/useMediaAssets';
import { useMediaSelection } from '../hooks/useMediaSelection';
import type { MediaAsset, MediaSourceKind, MediaSourceOption } from '../types';
import '../media.css';

export function MediaWorkspace({ embedded = false, siteId }: { embedded?: boolean; siteId?: string }) {
  const [source, setSource] = useState<MediaSourceOption['id']>('all');
  const [query, setQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [sources, setSources] = useState<MediaSourceOption[]>([]);
  const [detailId, setDetailId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const manifestInput = useRef<HTMLInputElement | null>(null);
  const selection = useMediaSelection();
  const { assets, loading, error, refresh } = useMediaAssets({ siteId, source: source === 'all' ? undefined : source as MediaSourceKind, query, limit: 120 });
  const detail = useMediaAsset(detailId);

  const refreshSources = () => mediaClient.sources().then((result) => setSources(result.sources)).catch(() => null);
  useEffect(() => { void refreshSources(); }, []);

  const open = (asset: MediaAsset) => {
    if (embedded) setDetailId(asset.id);
    else window.location.href = `/media/${encodeURIComponent(asset.id)}`;
  };

  const importManifest = async (file: File) => {
    setNotice('Importing migration manifest…');
    try {
      const manifest = JSON.parse(await file.text());
      const result = await mediaClient.importManifest(manifest);
      setNotice(`Import complete · ${result.created} new · ${result.reused} reused · ${result.usages} usages`);
      await Promise.all([refresh(), refreshSources()]);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Manifest import failed');
    }
  };

  return (
    <div className={`media-workspace${embedded ? ' media-workspace--embedded' : ''}`}>
      <header className="media-hero">
        <div><p>Legendary OS · Media</p><h1>{embedded ? 'Website media' : 'Media library'}</h1><span>{embedded ? 'Choose and manage the assets used by this website.' : 'One library for uploads, migrated website assets, project media, and future delivery variants.'}</span></div>
        <div className="media-hero__stats"><Stat label="Visible" value={assets.length} /><Stat label="Selected" value={selection.count} /><Stat label="Storage" value="R2" /></div>
      </header>

      <section className="media-library-card">
        <MediaToolbar query={query} onQuery={setQuery} selectionCount={selection.count} onUpload={() => setShowUpload(true)} onImport={() => manifestInput.current?.click()} onRefresh={() => { void refresh(); void refreshSources(); }} />
        <input ref={manifestInput} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importManifest(file); event.currentTarget.value = ''; }} />
        <MediaSourceTabs sources={sources} value={source} onChange={(next) => { setSource(next); selection.clear(); }} />
        {notice ? <div className="media-notice"><span>{notice}</span><button type="button" onClick={() => setNotice(null)}>×</button></div> : null}
        {error ? <div className="media-notice media-notice--error">{error}</div> : null}
        <MediaGrid assets={assets} selected={selection.selected} onToggle={selection.toggle} onOpen={open} loading={loading} />
      </section>

      <MediaUpload open={showUpload} siteId={siteId} onClose={() => setShowUpload(false)} onComplete={() => { setNotice('Upload saved to the media library.'); void refresh(); void refreshSources(); }} />
      {embedded && detailId && detail.asset ? <div className="media-embedded-detail-backdrop"><MediaAssetDetail asset={detail.asset} usages={detail.usages} onSave={detail.update} compact onClose={() => setDetailId('')} /></div> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
