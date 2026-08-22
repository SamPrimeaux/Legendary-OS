import React from 'react';

export function MediaEmptyState() {
  return (
    <div className="media-empty">
      <div className="media-empty__icon">M</div>
      <h3>No media matches this view</h3>
      <p>Upload a file, import the website migration manifest, or switch sources.</p>
    </div>
  );
}
