import React from 'react';
import type { MediaAsset } from '../types';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes > 10240 ? 0 : 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceLabel(asset: MediaAsset) {
  if (asset.source.kind === 'website_import') return 'Website';
  if (asset.source.kind === 'cloudflare_images') return 'CF Images';
  if (asset.source.kind === 'upload') return 'Upload';
  return asset.source.kind.toUpperCase();
}

export function MediaCard({ asset, selected, onToggle, onOpen }: { asset: MediaAsset; selected: boolean; onToggle: () => void; onOpen: () => void }) {
  const preview = asset.kind === 'image' ? `/api/media/assets/${encodeURIComponent(asset.id)}/variant?width=720&height=520&fit=cover&format=webp&quality=82` : null;
  return (
    <article className={`media-card${selected ? ' is-selected' : ''}`}>
      <button type="button" className="media-card__preview" onClick={onOpen} aria-label={`Open ${asset.filename}`}>
        {preview ? <img src={preview} alt={asset.altText || ''} loading="lazy" /> : <div className="media-file-fallback"><strong>{asset.kind.slice(0, 1).toUpperCase()}</strong><span>{asset.mimeType}</span></div>}
        <span className="media-source-badge">{sourceLabel(asset)}</span>
      </button>
      <button type="button" className={`media-card__check${selected ? ' is-checked' : ''}`} onClick={onToggle} aria-label={selected ? 'Unselect asset' : 'Select asset'}>{selected ? '✓' : ''}</button>
      <button type="button" className="media-card__meta" onClick={onOpen}>
        <strong title={asset.filename}>{asset.filename}</strong>
        <span>{asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}{formatBytes(asset.bytes)}</span>
      </button>
    </article>
  );
}
