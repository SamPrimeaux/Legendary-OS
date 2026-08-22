import { useCallback, useEffect, useState } from 'react';
import { mediaClient } from '../api/mediaClient';
import type { MediaAsset, MediaAssetFilters } from '../types';

export function useMediaAssets(filters: MediaAssetFilters) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const siteId = filters.siteId || '';
  const projectId = filters.projectId || '';
  const kind = filters.kind || '';
  const source = filters.source || '';
  const query = filters.query || '';
  const limit = filters.limit || 80;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mediaClient.listAssets({
        siteId: siteId || undefined,
        projectId: projectId || undefined,
        kind: kind || undefined,
        source: source || undefined,
        query: query || undefined,
        limit,
      });
      setAssets(result.assets);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load media');
    } finally {
      setLoading(false);
    }
  }, [siteId, projectId, kind, source, query, limit]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { assets, setAssets, loading, error, refresh };
}
