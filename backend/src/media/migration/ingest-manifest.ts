import type { NormalizedSiteIngestManifest } from '../contracts';

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

export function normalizeSiteIngestManifest(payload: unknown): NormalizedSiteIngestManifest {
  const root = asObject(payload);
  const assets: NormalizedSiteIngestManifest['assets'] = [];
  const usages: NormalizedSiteIngestManifest['usages'] = [];

  if (Array.isArray(root.assets)) {
    for (const raw of root.assets) {
      const item = asObject(raw);
      const r2Key = String(item.r2Key || item.r2_key || item.objectKey || item.object_key || '').trim();
      if (!r2Key) continue;
      assets.push({
        target: item.target ? String(item.target) : null,
        siteId: item.siteId || item.site_id || null,
        sourcePageUrl: item.sourcePageUrl || item.source_page_url || null,
        sourceUrl: item.sourceUrl || item.source_url || item.original_url || item.url || null,
        canonicalSourceIdentity: item.canonicalSourceIdentity || item.canonical_source_identity || null,
        r2Key,
        bucket: item.bucket || root.bucket || null,
        filename: item.filename || null,
        contentType: item.contentType || item.content_type || null,
        bytes: item.bytes == null ? null : Number(item.bytes),
        sha256: item.sha256 || item.checksum_sha256 || null,
        altText: item.altText || item.alt_text || item.alt || null,
        caption: item.caption || item.title || null,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      });
    }
  }

  const targets = asObject(root.targets);
  for (const [target, rawTarget] of Object.entries(targets)) {
    const targetData = asObject(rawTarget);
    for (const rawImage of Array.isArray(targetData.images) ? targetData.images : []) {
      const item = asObject(rawImage);
      const r2Key = String(item.r2_key || item.r2Key || '').trim();
      if (!r2Key) continue;
      assets.push({
        target,
        sourceUrl: item.original_url || item.url || null,
        r2Key,
        bucket: root.bucket || null,
        filename: item.filename || null,
        contentType: item.content_type || item.contentType || null,
        bytes: item.bytes == null ? null : Number(item.bytes),
        sha256: item.sha256 || null,
        altText: item.alt_text || item.alt || null,
        caption: item.caption || item.title || null,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      });
    }
    const targetUsages = Array.isArray(targetData.image_usages) ? targetData.image_usages : Array.isArray(targetData.usages) ? targetData.usages : [];
    for (const rawUsage of targetUsages) {
      const usage = asObject(rawUsage);
      usages.push({
        target,
        assetSourceUrl: usage.asset_source_url || usage.assetSourceUrl || usage.url || usage.source_url || null,
        assetSha256: usage.sha256 || usage.asset_sha256 || null,
        sourcePageUrl: usage.page_url || usage.source_page_url || usage.sourcePageUrl || null,
        pageId: usage.page_id || usage.pageId || null,
        sectionId: usage.section_id || usage.sectionId || null,
        projectId: usage.project_id || usage.projectId || null,
        role: usage.role || null,
        altText: usage.alt_text || usage.alt || null,
        caption: usage.caption || usage.title || null,
      });
    }
  }

  if (Array.isArray(root.usages)) {
    for (const rawUsage of root.usages) {
      const usage = asObject(rawUsage);
      usages.push({
        target: usage.target || null,
        assetSourceUrl: usage.assetSourceUrl || usage.asset_source_url || usage.sourceUrl || usage.source_url || null,
        assetSha256: usage.assetSha256 || usage.asset_sha256 || usage.sha256 || null,
        sourcePageUrl: usage.sourcePageUrl || usage.source_page_url || usage.page_url || null,
        pageId: usage.pageId || usage.page_id || null,
        sectionId: usage.sectionId || usage.section_id || null,
        projectId: usage.projectId || usage.project_id || null,
        role: usage.role || null,
        altText: usage.altText || usage.alt_text || usage.alt || null,
        caption: usage.caption || usage.title || null,
      });
    }
  }

  return { bucket: root.bucket || null, assets, usages };
}
