import {
  createContentRuntime,
  eventForAsset,
  matchesQuery,
  type ContentAsset,
  type ContentKind,
  type ContentOrigin,
  type ContentQuery,
  type ContentRevision,
  type ContentRuntime,
  type ContentState,
  type ContentStore,
  type ContentUsage,
} from '@inneranimalmedia/agentsam-content';
import { mediaClient } from '../media/api/mediaClient';
import type { MediaAsset, MediaAssetUsage } from '../media/types';

const ACCOUNT_ID = 'legendary';
const CONTENT_META_KEY = 'agentsamContent';

type ContentMetadata = {
  state?: ContentState;
  title?: string;
  semanticAlias?: string;
  deliveryAlias?: string;
  role?: string;
  resourceTags?: Record<string, string>;
  rating?: number;
  ext?: Record<string, unknown>;
  provenance?: ContentAsset['provenance'];
  revisions?: ContentRevision[];
};

function contentMeta(asset: MediaAsset): ContentMetadata {
  const value = asset.metadata?.[CONTENT_META_KEY];
  return value && typeof value === 'object' ? value as ContentMetadata : {};
}

function contentKind(asset: MediaAsset): ContentKind {
  if (asset.kind === 'image' || asset.kind === 'video' || asset.kind === 'audio' || asset.kind === 'document') return asset.kind;
  const name = asset.filename.toLowerCase();
  if (/\.(glb|gltf|usdz)$/.test(name)) return 'model';
  if (/\.(woff2?|ttf|otf)$/.test(name)) return 'font';
  return 'document';
}

function contentOrigin(asset: MediaAsset): ContentOrigin {
  if (asset.source.kind === 'upload') return 'upload';
  if (asset.source.kind === 'website_import') return 'site-crawl';
  return 'provider-sync';
}

function contentState(asset: MediaAsset, meta: ContentMetadata): ContentState {
  if (meta.state) return meta.state;
  if (asset.status === 'archived') return 'archived';
  if (asset.status === 'processing') return 'draft';
  if (asset.status === 'failed') return 'review';
  return 'approved';
}

function iso(value: number | null | undefined) {
  return new Date(Number(value || Date.now())).toISOString();
}

function toUsage(usage: MediaAssetUsage): ContentUsage {
  const surface = [
    usage.pageId ? `page:${usage.pageId}` : '',
    usage.sectionId ? `section:${usage.sectionId}` : '',
    usage.role ? `role:${usage.role}` : '',
  ].filter(Boolean).join('/') || usage.sourcePageUrl || usage.sourceUrl || usage.id;

  return {
    app: usage.siteId || usage.projectId || 'legendary',
    surface,
    kind: usage.pageId ? 'page' : 'embed',
    live: true,
    attachedAt: iso(usage.createdAt),
  };
}

function toContentAsset(asset: MediaAsset, usages: MediaAssetUsage[] = []): ContentAsset {
  const meta = contentMeta(asset);
  const createdAt = iso(asset.createdAt);
  const providerUrl = asset.delivery.publicUrl || asset.delivery.originalUrl || undefined;
  const variants: ContentAsset['variants'] = [];

  if (asset.delivery.thumbnailUrl) {
    variants.push({
      name: 'thumbnail',
      url: asset.delivery.thumbnailUrl,
      width: 360,
      approved: true,
      createdAt,
    });
  }

  return {
    id: asset.id,
    accountId: ACCOUNT_ID,
    brandId: asset.siteId || undefined,
    projectId: asset.projectId || undefined,
    kind: contentKind(asset),
    origin: contentOrigin(asset),
    state: contentState(asset, meta),
    source: {
      type:
        asset.source.kind === 'upload' ? 'upload' :
        asset.source.kind === 'website_import' ? 'site-crawl' :
        'provider-sync',
      ref: asset.source.url || asset.source.canonicalIdentity || asset.storage.key,
      importedAt: createdAt,
    },
    providerRefs: [{
      provider: asset.storage.provider || 'r2',
      ref: asset.storage.key,
      role: 'master',
      scope: asset.storage.bucket,
      bytes: asset.bytes,
      mime: asset.mimeType,
      url: providerUrl,
    }],
    title: meta.title || asset.filename,
    filename: asset.originalFilename || asset.filename,
    semanticAlias: meta.semanticAlias,
    deliveryAlias: meta.deliveryAlias,
    mime: asset.mimeType,
    bytes: asset.bytes,
    width: asset.width || undefined,
    height: asset.height || undefined,
    tags: asset.tags,
    resourceTags: meta.resourceTags,
    role: meta.role,
    alt: asset.altText || undefined,
    caption: asset.caption || undefined,
    variants,
    usage: usages.map(toUsage),
    provenance: meta.provenance || {
      import: asset.source.url ? { sourceUrl: asset.source.url } : undefined,
      history: [{
        at: createdAt,
        action: asset.source.kind === 'upload' ? 'uploaded' : 'imported',
        actor: { type: asset.source.kind === 'upload' ? 'human' : 'import', ref: 'legendary-media' },
      }],
    },
    createdBy: { type: asset.source.kind === 'upload' ? 'human' : 'import', ref: 'legendary-media' },
    createdAt,
    updatedAt: iso(asset.updatedAt),
    rating: meta.rating,
    ext: {
      ...(meta.ext || {}),
      sha256: asset.sha256,
      sourceKind: asset.source.kind,
      storageProvider: asset.storage.provider,
      storageBucket: asset.storage.bucket,
    },
  };
}

function parseCursor(cursor?: string) {
  const [offsetText, matchedText] = String(cursor || '0:0').split(':', 2);
  return {
    offset: Math.max(0, Number(offsetText || 0)),
    matched: Math.max(0, Number(matchedText || 0)),
  };
}

function nativeMediaKind(query: ContentQuery): MediaAsset['kind'] | undefined {
  if (Array.isArray(query.kind)) return undefined;
  return query.kind === 'image' || query.kind === 'video' || query.kind === 'audio' || query.kind === 'document'
    ? query.kind
    : undefined;
}

function mediaPatchFor(asset: ContentAsset, current: MediaAsset) {
  const currentMeta = contentMeta(current);
  return {
    siteId: asset.brandId ?? current.siteId,
    projectId: asset.projectId ?? current.projectId,
    altText: asset.alt ?? null,
    caption: asset.caption ?? null,
    tags: asset.tags,
    status: asset.state === 'archived' ? 'archived' as const : current.status,
    metadata: {
      ...current.metadata,
      [CONTENT_META_KEY]: {
        ...currentMeta,
        state: asset.state,
        title: asset.title,
        semanticAlias: asset.semanticAlias,
        deliveryAlias: asset.deliveryAlias,
        role: asset.role,
        resourceTags: asset.resourceTags,
        rating: asset.rating,
        ext: asset.ext,
        provenance: asset.provenance,
      } satisfies ContentMetadata,
    },
  };
}

class LegendaryMediaContentStore implements ContentStore {
  async get(id: string) {
    const [{ asset }, { usages }] = await Promise.all([
      mediaClient.getAsset(id),
      mediaClient.listUsages(id),
    ]);
    return toContentAsset(asset, usages);
  }

  async put(asset: ContentAsset) {
    const { asset: current } = await mediaClient.getAsset(asset.id);
    await mediaClient.updateAsset(asset.id, mediaPatchFor(asset, current));
  }

  async delete(id: string) {
    await mediaClient.removeAsset(id);
  }

  async list(query: ContentQuery = {}) {
    const requested = Math.max(1, Math.min(200, Number(query.limit || 100)));
    const cursor = parseCursor(query.cursor);
    let sourceOffset = cursor.offset;
    let matched = cursor.matched;
    let sourceTotal = Number.POSITIVE_INFINITY;
    const selected: ContentAsset[] = [];

    while (selected.length < requested && sourceOffset < sourceTotal) {
      const result = await mediaClient.listAssets({
        siteId: query.brandId,
        projectId: query.projectId,
        kind: nativeMediaKind(query),
        query: query.search,
        limit: 200,
        offset: sourceOffset,
      });
      sourceTotal = result.total;
      if (!result.assets.length) break;

      for (const mediaAsset of result.assets) {
        const usages = result.usagesByAsset?.[mediaAsset.id] || [];
        const asset = toContentAsset(mediaAsset, usages);
        sourceOffset += 1;
        if (matchesQuery(asset, query)) {
          selected.push(asset);
          matched += 1;
        }
        if (selected.length >= requested) break;
      }
    }

    const hasMore = sourceOffset < sourceTotal;
    return {
      assets: selected,
      total: hasMore ? matched + 1 : matched,
      cursor: hasMore ? String(sourceOffset) + ':' + String(matched) : undefined,
    };
  }

  async addRevision(revision: ContentRevision) {
    const { asset } = await mediaClient.getAsset(revision.assetId);
    const meta = contentMeta(asset);
    const revisions = [...(meta.revisions || []), revision].slice(-100);
    await mediaClient.updateAsset(asset.id, {
      metadata: {
        ...asset.metadata,
        [CONTENT_META_KEY]: { ...meta, revisions },
      },
    });
  }

  async revisions(assetId: string) {
    const { asset } = await mediaClient.getAsset(assetId);
    return contentMeta(asset).revisions || [];
  }

  async all() {
    const assets: ContentAsset[] = [];
    let offset = 0;
    while (true) {
      const page = await mediaClient.listAssets({ limit: 200, offset });
      for (const asset of page.assets) {
        assets.push(toContentAsset(asset, page.usagesByAsset?.[asset.id] || []));
      }
      if (page.nextOffset == null) break;
      offset = page.nextOffset;
    }
    return assets;
  }
}

function emitCreated(runtime: ContentRuntime, asset: ContentAsset) {
  runtime.events.emit(eventForAsset('content.asset.created', asset, runtime.identity, {
    origin: asset.origin,
    adapter: 'legendary-media',
  }));
}

export function createLegendaryContentRuntime(actorId: string): ContentRuntime {
  const store = new LegendaryMediaContentStore();
  const base = createContentRuntime({
    account: { id: ACCOUNT_ID, label: 'Legendary' },
    identity: { type: 'human', ref: actorId },
    store,
    theme: {
      accent: '#0f8f83',
      canvas: '#f8f7f3',
      panel: '#ffffff',
      text: '#171a18',
    },
  });

  return {
    ...base,
    async importAsset(input) {
      if (!input.file) throw new Error('legendary_content_upload_requires_file');
      const { asset } = await mediaClient.upload({
        file: input.file,
        siteId: input.brandId,
        projectId: input.projectId,
      });
      const contentAsset = toContentAsset(asset);
      emitCreated(base, contentAsset);
      return contentAsset;
    },
  };
}
