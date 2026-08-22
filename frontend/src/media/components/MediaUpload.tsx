import React, { useRef, useState } from 'react';
import { useMediaUpload } from '../hooks/useMediaUpload';
import type { MediaAsset } from '../types';

export function MediaUpload({ open, siteId, onClose, onComplete }: {
  open: boolean;
  siteId?: string;
  onClose: () => void;
  onComplete: (asset: MediaAsset) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [dragging, setDragging] = useState(false);
  const { upload, uploading, error, clearError } = useMediaUpload();

  if (!open) return null;

  const submit = async () => {
    if (!file) return;
    const result = await upload({ file, siteId, altText, caption, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) });
    onComplete(result.asset);
    setFile(null); setAltText(''); setCaption(''); setTags(''); clearError(); onClose();
  };

  const choose = (next: File | null) => { setFile(next); clearError(); };

  return (
    <div className="media-modal-backdrop" onMouseDown={onClose}>
      <section className="media-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Upload media">
        <header className="media-modal__head"><div><small>Media library</small><h2>Upload a file</h2></div><button type="button" onClick={onClose}>×</button></header>
        <button
          type="button"
          className={`media-dropzone${dragging ? ' is-dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files?.[0] || null); }}
        >
          <strong>{file ? file.name : 'Drop a file here'}</strong>
          <span>{file ? `${Math.round(file.size / 1024)} KB · click to replace` : 'or click to browse · up to 25 MB'}</span>
        </button>
        <input ref={inputRef} hidden type="file" onChange={(event) => choose(event.target.files?.[0] || null)} />
        <div className="media-form-grid">
          <label><span>Alt text</span><input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image for accessibility" /></label>
          <label><span>Caption</span><input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Optional display caption" /></label>
          <label className="media-form-grid__wide"><span>Tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="project, exterior, portfolio" /></label>
        </div>
        {error ? <p className="media-error">{error}</p> : null}
        <footer className="media-modal__actions"><button className="media-btn" type="button" onClick={onClose}>Cancel</button><button className="media-btn media-btn--primary" type="button" onClick={() => void submit()} disabled={!file || uploading}>{uploading ? 'Uploading…' : 'Upload to media'}</button></footer>
      </section>
    </div>
  );
}
