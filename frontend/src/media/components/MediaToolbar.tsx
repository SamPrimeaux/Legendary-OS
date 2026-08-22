import React from 'react';

export function MediaToolbar({
  query,
  onQuery,
  selectionCount,
  onUpload,
  onImport,
  onRefresh,
}: {
  query: string;
  onQuery: (value: string) => void;
  selectionCount: number;
  onUpload: () => void;
  onImport: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="media-toolbar">
      <label className="media-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search files, tags, alt text…" />
      </label>
      <div className="media-toolbar__actions">
        {selectionCount ? <span className="media-selection-count">{selectionCount} selected</span> : null}
        <button type="button" className="media-btn" onClick={onRefresh}>Refresh</button>
        <button type="button" className="media-btn" onClick={onImport}>Import manifest</button>
        <button type="button" className="media-btn media-btn--primary" onClick={onUpload}>Upload</button>
      </div>
    </div>
  );
}
