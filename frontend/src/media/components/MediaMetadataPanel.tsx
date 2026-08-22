import React, { useEffect, useState } from 'react';
import type { MediaAsset, MediaAssetPatch } from '../types';

export function MediaMetadataPanel({ asset, onSave }: { asset: MediaAsset; onSave: (patch: MediaAssetPatch) => Promise<MediaAsset> }) {
  const [altText, setAltText] = useState(asset.altText || '');
  const [caption, setCaption] = useState(asset.caption || '');
  const [tags, setTags] = useState(asset.tags.join(', '));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => { setAltText(asset.altText || ''); setCaption(asset.caption || ''); setTags(asset.tags.join(', ')); }, [asset]);

  const save = async () => {
    setState('saving');
    try {
      await onSave({ altText: altText.trim() || null, caption: caption.trim() || null, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) });
      setState('saved');
    } catch { setState('error'); }
  };

  return (
    <section className="media-metadata-panel">
      <div className="media-panel-title"><div><small>Details</small><strong>Metadata</strong></div><span>{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Save failed' : ''}</span></div>
      <label><span>Alt text</span><textarea value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Accessible description" /></label>
      <label><span>Caption</span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Optional caption" /></label>
      <label><span>Tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="portfolio, kitchen, exterior" /></label>
      <button type="button" className="media-btn media-btn--primary" onClick={() => void save()} disabled={state === 'saving'}>Save metadata</button>
    </section>
  );
}
