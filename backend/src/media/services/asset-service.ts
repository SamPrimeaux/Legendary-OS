import type { ExistingR2AssetInput, MediaAsset, MediaAssetListFilters, MediaAssetPatch, MediaSourceKind } from '../contracts';
import { mediaKindFor, normalizeTags } from '../contracts';
import { inspectMediaBytes } from '../adapters/image-info';
import { D1MediaStore } from '../adapters/d1-media-store';
import { R2MediaObjectStore } from '../adapters/r2-object-store';

function sourceDomain(url?: string | null) {
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

function canonicalSourceIdentity(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const queryKeys: string[] = [];
    parsed.searchParams.forEach((_value, key) => queryKeys.push(key));
    for (const key of queryKeys) {
      if (/^(utm_|fbclid|gclid|msclkid)/i.test(key)) parsed.searchParams.delete(key);
    }
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith('wixstatic.com')) {
      const match = parsed.pathname.match(/\/media\/([^/]+)/);
      if (match) return `wix:${match[1]}`;
    }
    if (host.endsWith('wsimg.com')) {
      const marker = parsed.pathname.indexOf('/:/');
      return `godaddy:${marker >= 0 ? parsed.pathname.slice(0, marker) : parsed.pathname}`;
    }
    return parsed.toString();
  } catch { return url; }
}

export class AssetService {
  constructor(
    readonly store: D1MediaStore,
    readonly objects: R2MediaObjectStore,
    readonly imagesBinding?: any,
  ) {}

  list(filters: MediaAssetListFilters) { return this.store.listAssets(filters); }
  get(id: string, organizationId: string) { return this.store.getAsset(id, organizationId); }
  update(id: string, organizationId: string, patch: MediaAssetPatch) { return this.store.updateAsset(id, organizationId, patch); }

  async upload(input: {
    organizationId: string;
    siteId?: string | null;
    projectId?: string | null;
    file: File;
    sourceKind?: MediaSourceKind;
    sourceUrl?: string | null;
    altText?: string | null;
    caption?: string | null;
    tags?: string[];
  }): Promise<{ asset: MediaAsset; duplicate: boolean }> {
    const buffer = await input.file.arrayBuffer();
    const inspected = await inspectMediaBytes(buffer, input.file.name, input.file.type || 'application/octet-stream', this.imagesBinding);
    const duplicate = await this.store.findBySha(inspected.sha256, input.organizationId);
    if (duplicate) return { asset: duplicate, duplicate: true };

    const key = this.objects.keyForHash(inspected.sha256, inspected.extension);
    const now = Date.now();
    await this.objects.put(key, buffer, {
      contentType: inspected.mimeType,
      customMetadata: {
        iam_sha256: inspected.sha256,
        iam_source: input.sourceKind || 'upload',
        iam_organization: input.organizationId,
      },
    });
    const head = await this.objects.head(key);
    const publicUrl = this.objects.publicPath(key);
    const asset: MediaAsset = {
      id: `asset_${crypto.randomUUID()}`,
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      projectId: input.projectId ?? null,
      filename: input.file.name || `${inspected.sha256}.${inspected.extension}`,
      originalFilename: input.file.name || `${inspected.sha256}.${inspected.extension}`,
      mimeType: inspected.mimeType,
      kind: mediaKindFor(inspected.mimeType, input.file.name),
      bytes: inspected.bytes,
      width: inspected.width,
      height: inspected.height,
      aspectRatio: inspected.aspectRatio,
      orientation: inspected.orientation,
      sha256: inspected.sha256,
      storage: { provider: 'r2', bucket: this.objects.bucketName, key, etag: head?.etag ?? null },
      delivery: { originalUrl: publicUrl, publicUrl, thumbnailUrl: null },
      source: {
        kind: input.sourceKind || 'upload',
        url: input.sourceUrl ?? null,
        canonicalIdentity: canonicalSourceIdentity(input.sourceUrl),
        domain: sourceDomain(input.sourceUrl),
      },
      altText: input.altText ?? null,
      caption: input.caption ?? null,
      tags: normalizeTags(input.tags),
      metadata: {},
      status: 'ready',
      createdAt: now,
      updatedAt: now,
      importedAt: input.sourceKind === 'website_import' ? now : null,
    };
    await this.store.insertAsset(asset);
    return { asset, duplicate: false };
  }

  async registerExisting(input: ExistingR2AssetInput): Promise<{ asset: MediaAsset; duplicate: boolean }> {
    if (input.sha256) {
      const existing = await this.store.findBySha(input.sha256, input.organizationId);
      if (existing) return { asset: existing, duplicate: true };
    }
    const object = await this.objects.get(input.objectKey);
    if (!object) throw new Error(`R2 object not found: ${input.objectKey}`);
    const buffer = await object.arrayBuffer();
    const inspected = await inspectMediaBytes(buffer, input.filename || input.objectKey.split('/').pop() || 'asset', input.mimeType || object.httpMetadata?.contentType || 'application/octet-stream', this.imagesBinding);
    const existing = await this.store.findBySha(input.sha256 || inspected.sha256, input.organizationId);
    if (existing) return { asset: existing, duplicate: true };
    const now = Date.now();
    const filename = input.filename || input.objectKey.split('/').pop() || `${inspected.sha256}.${inspected.extension}`;
    const publicUrl = this.objects.publicPath(input.objectKey);
    const asset: MediaAsset = {
      id: `asset_${crypto.randomUUID()}`,
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      projectId: input.projectId ?? null,
      filename,
      originalFilename: filename,
      mimeType: input.mimeType || inspected.mimeType,
      kind: mediaKindFor(input.mimeType || inspected.mimeType, filename),
      bytes: input.bytes || inspected.bytes,
      width: inspected.width,
      height: inspected.height,
      aspectRatio: inspected.aspectRatio,
      orientation: inspected.orientation,
      sha256: input.sha256 || inspected.sha256,
      storage: { provider: 'r2', bucket: input.bucket || this.objects.bucketName, key: input.objectKey, etag: object.etag ?? null },
      delivery: { originalUrl: publicUrl, publicUrl, thumbnailUrl: null },
      source: {
        kind: input.sourceKind || 'r2',
        url: input.sourceUrl ?? null,
        canonicalIdentity: input.canonicalSourceIdentity || canonicalSourceIdentity(input.sourceUrl),
        domain: sourceDomain(input.sourceUrl),
      },
      altText: input.altText ?? null,
      caption: input.caption ?? null,
      tags: normalizeTags(input.tags),
      metadata: input.metadata ?? {},
      status: 'ready',
      createdAt: now,
      updatedAt: now,
      importedAt: input.importedAt ?? now,
    };
    await this.store.insertAsset(asset);
    return { asset, duplicate: false };
  }

  async remove(id: string, organizationId: string, force = false) {
    const asset = await this.store.getAsset(id, organizationId);
    if (!asset) return { removed: false, reason: 'not_found' } as const;
    const usages = await this.store.countUsages(id, organizationId);
    if (usages > 0 && !force) return { removed: false, reason: 'in_use', usages } as const;
    await this.store.deleteAsset(id, organizationId);
    await this.objects.delete(asset.storage.key).catch(() => null);
    return { removed: true, asset } as const;
  }
}
