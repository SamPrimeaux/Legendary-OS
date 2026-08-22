import React, { useMemo, useState } from 'react';
import { useMediaAssets } from '../hooks/useMediaAssets';
import type { MediaAsset } from '../types';
import { MediaGrid } from './MediaGrid';

export function MediaPicker({ open, value, siteId, onChange, onClose }: {
  open: boolean;
  value?: string | null;
  siteId?: string;
  onChange: (asset: MediaAsset | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const { assets, loading } = useMediaAssets({ siteId, kind: 'image', query, limit: 100 });
  const selected = useMemo(() => new Set(value ? [value] : []), [value]);
  if (!open) return null;
  return (
    <div className="media-modal-backdrop" onMouseDown={onClose}>
      <section className="media-picker" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Choose media">
        <header className="media-picker__head"><div><small>Media library</small><h2>Choose an image</h2></div><button type="button" onClick={onClose}>×</button></header>
        <label className="media-search media-search--picker"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search images…" /></label>
        <div className="media-picker__grid"><MediaGrid assets={assets} selected={selected} onToggle={(id) => { const asset = assets.find((item) => item.id === id); if (asset) { onChange(asset); onClose(); } }} onOpen={(asset) => { onChange(asset); onClose(); }} loading={loading} /></div>
        <footer className="media-picker__actions">{value ? <button type="button" className="media-btn media-btn--danger" onClick={() => { onChange(null); onClose(); }}>Remove selection</button> : <span />}<button type="button" className="media-btn" onClick={onClose}>Cancel</button></footer>
      </section>
    </div>
  );
}
