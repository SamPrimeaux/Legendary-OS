import React from 'react';
import type { MediaAsset } from '../types';
import { MediaCard } from './MediaCard';
import { MediaEmptyState } from './MediaEmptyState';

export function MediaGrid({ assets, selected, onToggle, onOpen, loading }: {
  assets: MediaAsset[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (asset: MediaAsset) => void;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="media-grid" aria-label="Loading media">{Array.from({ length: 8 }).map((_, index) => <div className="media-card media-card--skeleton" key={index}><div className="media-card__preview"/><div className="media-card__meta"/></div>)}</div>;
  }
  if (!assets.length) return <MediaEmptyState />;
  return (
    <div className="media-grid">
      {assets.map((asset) => <MediaCard key={asset.id} asset={asset} selected={selected.has(asset.id)} onToggle={() => onToggle(asset.id)} onOpen={() => onOpen(asset)} />)}
    </div>
  );
}
