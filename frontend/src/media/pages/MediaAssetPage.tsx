import React from 'react';
import { MediaAssetDetail } from '../components/MediaAssetDetail';
import { useMediaAsset } from '../hooks/useMediaAsset';
import '../media.css';

export function MediaAssetPage({ assetId }: { assetId: string }) {
  const { asset, usages, loading, error, update } = useMediaAsset(assetId);
  if (loading) return <div className="media-page-state">Loading media…</div>;
  if (error || !asset) return <div className="media-page-state"><strong>Unable to open media</strong><span>{error || 'Asset not found'}</span><a href="/media">Back to media</a></div>;
  return <div className="media-asset-page"><MediaAssetDetail asset={asset} usages={usages} onSave={update} /></div>;
}
