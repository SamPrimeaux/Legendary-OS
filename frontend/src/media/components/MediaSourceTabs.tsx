import React from 'react';
import type { MediaSourceOption } from '../types';

const FALLBACK: MediaSourceOption[] = [
  { id: 'all', label: 'All', count: 0 },
  { id: 'upload', label: 'Uploads', count: 0 },
  { id: 'website_import', label: 'Website import', count: 0 },
  { id: 'r2', label: 'R2', count: 0 },
  { id: 'cloudflare_images', label: 'Cloudflare Images', count: 0 },
];

export function MediaSourceTabs({ sources, value, onChange }: { sources: MediaSourceOption[]; value: string; onChange: (value: MediaSourceOption['id']) => void }) {
  const items = sources.length ? sources : FALLBACK;
  return (
    <nav className="media-source-tabs" aria-label="Media sources">
      {items.map((source) => (
        <button key={source.id} type="button" className={value === source.id ? 'is-active' : ''} onClick={() => onChange(source.id)}>
          <span>{source.label}</span><small>{source.count}</small>
        </button>
      ))}
    </nav>
  );
}
