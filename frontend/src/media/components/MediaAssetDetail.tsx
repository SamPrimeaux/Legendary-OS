import React from 'react';
import type { MediaAsset, MediaAssetPatch, MediaAssetUsage } from '../types';
import { MediaMetadataPanel } from './MediaMetadataPanel';

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function shortHash(hash: string) { return hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : '—'; }

export function MediaAssetDetail({ asset, usages, onSave, onClose, compact = false }: {
  asset: MediaAsset;
  usages: MediaAssetUsage[];
  onSave: (patch: MediaAssetPatch) => Promise<MediaAsset>;
  onClose?: () => void;
  compact?: boolean;
}) {
  const image = asset.kind === 'image';
  return (
    <div className={`media-detail${compact ? ' media-detail--compact' : ''}`}>
      <section className="media-detail__preview-panel">
        <header><button type="button" className="media-back" onClick={onClose || (() => { window.location.href = '/media'; })}>← <span>Media</span></button><div className="media-detail__filename"><strong>{asset.filename}</strong><small>{asset.mimeType}</small></div><a className="media-btn" href={asset.delivery.originalUrl} target="_blank" rel="noreferrer">Original</a></header>
        <div className="media-detail__preview">{image ? <img src={`/api/media/assets/${encodeURIComponent(asset.id)}/variant?width=1800&height=1200&fit=scale-down&format=webp&quality=88`} alt={asset.altText || ''} /> : <div className="media-file-fallback media-file-fallback--large"><strong>{asset.kind}</strong><span>{asset.mimeType}</span></div>}</div>
        <div className="media-detail__facts">
          <Fact label="Dimensions" value={asset.width && asset.height ? `${asset.width} × ${asset.height}` : '—'} />
          <Fact label="File size" value={formatBytes(asset.bytes)} />
          <Fact label="Source" value={asset.source.kind.replace('_', ' ')} />
          <Fact label="Used in" value={`${usages.length} place${usages.length === 1 ? '' : 's'}`} />
          <Fact label="SHA-256" value={shortHash(asset.sha256)} />
          <Fact label="R2 key" value={asset.storage.key} />
        </div>
      </section>
      <aside className="media-detail__sidebar">
        <MediaMetadataPanel asset={asset} onSave={onSave} />
        <section className="media-usage-panel">
          <div className="media-panel-title"><div><small>Relationships</small><strong>Asset usages</strong></div><span>{usages.length}</span></div>
          {usages.length ? <ul>{usages.map((usage) => <li key={usage.id}><strong>{usage.role || 'Media usage'}</strong><span>{usage.sourcePageUrl || usage.pageId || usage.projectId || usage.siteId || 'Legendary OS'}</span></li>)}</ul> : <p>No CMS/project usage is registered yet.</p>}
        </section>
      </aside>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div className="media-fact"><span>{label}</span><strong title={value}>{value}</strong></div>; }
