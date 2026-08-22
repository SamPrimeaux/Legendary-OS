export function attachMediaAssetId(data: Record<string, unknown>, field: string, assetId: string | null) {
  const next = { ...data };
  if (assetId) next[field] = assetId;
  else delete next[field];
  return next;
}

export function collectMediaAssetIds(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const found = new Set<string>();
  const walk = (value: unknown, key = '') => {
    if (typeof value === 'string' && /asset(?:_?id)?$/i.test(key) && value.startsWith('asset_')) found.add(value);
    else if (Array.isArray(value)) value.forEach((item) => walk(item, key));
    else if (value && typeof value === 'object') Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) => walk(child, childKey));
  };
  walk(data);
  return [...found];
}
