import { normalizeSiteIngestManifest } from '../migration/ingest-manifest';
import { AssetService } from './asset-service';
import { UsageService } from './usage-service';

export class ImportService {
  constructor(readonly assets: AssetService, readonly usages: UsageService) {}

  async importSiteManifest(input: {
    organizationId: string;
    manifest: unknown;
    siteMap?: Record<string, string>;
  }) {
    const normalized = normalizeSiteIngestManifest(input.manifest);
    const bySha = new Map<string, string>();
    const bySource = new Map<string, string>();
    const results = { created: 0, reused: 0, usages: 0, failed: [] as Array<{ key?: string; error: string }> };

    for (const candidate of normalized.assets) {
      try {
        const siteId = candidate.siteId || (candidate.target ? input.siteMap?.[candidate.target] : undefined) || null;
        const result = await this.assets.registerExisting({
          organizationId: input.organizationId,
          siteId,
          objectKey: candidate.r2Key,
          bucket: candidate.bucket || normalized.bucket || this.assets.objects.bucketName,
          filename: candidate.filename || candidate.r2Key.split('/').pop() || undefined,
          mimeType: candidate.contentType || undefined,
          bytes: candidate.bytes || undefined,
          sha256: candidate.sha256 || undefined,
          sourceUrl: candidate.sourceUrl,
          canonicalSourceIdentity: candidate.canonicalSourceIdentity,
          sourceKind: 'website_import',
          altText: candidate.altText,
          caption: candidate.caption,
          tags: candidate.tags,
          metadata: { ingest_target: candidate.target || null, source_page_url: candidate.sourcePageUrl || null },
          importedAt: Date.now(),
        });
        if (result.duplicate) results.reused += 1; else results.created += 1;
        if (result.asset.sha256) bySha.set(result.asset.sha256, result.asset.id);
        if (candidate.sourceUrl) bySource.set(candidate.sourceUrl, result.asset.id);
        if (siteId || candidate.sourcePageUrl || candidate.sourceUrl) {
          await this.usages.add(result.asset.id, input.organizationId, {
            assetId: result.asset.id,
            siteId,
            sourcePageUrl: candidate.sourcePageUrl,
            sourceUrl: candidate.sourceUrl,
            altText: candidate.altText,
            caption: candidate.caption,
            role: 'website-import',
          });
          results.usages += 1;
        }
      } catch (error) {
        results.failed.push({ key: candidate.r2Key, error: error instanceof Error ? error.message : String(error) });
      }
    }

    for (const usage of normalized.usages) {
      const assetId = (usage.assetSha256 ? bySha.get(usage.assetSha256) : undefined) || (usage.assetSourceUrl ? bySource.get(usage.assetSourceUrl) : undefined);
      if (!assetId) continue;
      try {
        await this.usages.add(assetId, input.organizationId, {
          assetId,
          siteId: usage.target ? input.siteMap?.[usage.target] || null : null,
          pageId: usage.pageId,
          sectionId: usage.sectionId,
          projectId: usage.projectId,
          sourcePageUrl: usage.sourcePageUrl,
          sourceUrl: usage.assetSourceUrl,
          role: usage.role || 'website-import',
          altText: usage.altText,
          caption: usage.caption,
        });
        results.usages += 1;
      } catch (error) {
        results.failed.push({ error: error instanceof Error ? error.message : String(error) });
      }
    }

    return { ...results, total: normalized.assets.length };
  }
}
