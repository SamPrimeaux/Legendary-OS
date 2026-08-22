import { useCallback, useEffect, useState } from 'react';
import { mediaClient } from '../api/mediaClient';
import type { MediaAsset, MediaAssetPatch, MediaAssetUsage } from '../types';

export function useMediaAsset(assetId: string) {
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [usages, setUsages] = useState<MediaAssetUsage[]>([]);
  const [loading, setLoading] = useState(Boolean(assetId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const [assetResult, usageResult] = await Promise.all([
        mediaClient.getAsset(assetId),
        mediaClient.listUsages(assetId),
      ]);
      setAsset(assetResult.asset);
      setUsages(usageResult.usages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load asset');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const update = useCallback(async (patch: MediaAssetPatch) => {
    const result = await mediaClient.updateAsset(assetId, patch);
    setAsset(result.asset);
    return result.asset;
  }, [assetId]);

  return { asset, usages, loading, error, refresh, update };
}
