import type {
  MediaAsset,
  MediaAssetListFilters,
  MediaAssetPatch,
  MediaAssetUsage,
  MediaUsageInput,
} from '../contracts';
import { normalizeTags } from '../contracts';

export interface MediaD1Statement {
  bind(...values: unknown[]): MediaD1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

export interface MediaD1Database {
  prepare(sql: string): MediaD1Statement;
}

type AssetRow = Record<string, unknown>;
type UsageRow = Record<string, unknown>;

function parseJson<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object') return value as T;
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function assetFromRow(row: AssetRow): MediaAsset {
  const key = String(row.object_key || '');
  const bucket = String(row.bucket || 'legendary-os');
  const publicUrl = `/assets/${key.split('/').map(encodeURIComponent).join('/')}`;
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    siteId: row.site_id == null ? null : String(row.site_id),
    projectId: row.project_id == null ? null : String(row.project_id),
    filename: String(row.filename || ''),
    originalFilename: String(row.original_filename || row.filename || ''),
    mimeType: String(row.content_type || 'application/octet-stream'),
    kind: String(row.media_kind || 'unknown') as MediaAsset['kind'],
    bytes: Number(row.size_bytes || 0),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    aspectRatio: row.aspect_ratio == null ? null : Number(row.aspect_ratio),
    orientation: row.orientation == null ? null : Number(row.orientation),
    sha256: String(row.checksum_sha256 || ''),
    storage: { provider: 'r2', bucket, key, etag: row.etag == null ? null : String(row.etag) },
    delivery: { originalUrl: publicUrl, publicUrl, thumbnailUrl: null },
    source: {
      kind: String(row.source_kind || 'r2') as MediaAsset['source']['kind'],
      url: row.source_url == null ? null : String(row.source_url),
      canonicalIdentity: row.canonical_source_id == null ? null : String(row.canonical_source_id),
      domain: row.source_domain == null ? null : String(row.source_domain),
    },
    altText: row.alt_text == null ? null : String(row.alt_text),
    caption: row.caption == null ? null : String(row.caption),
    tags: normalizeTags(parseJson(row.tags_json, [])),
    metadata: parseJson(row.metadata_json, {}),
    status: String(row.status || 'ready') as MediaAsset['status'],
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || row.created_at || 0),
    importedAt: row.imported_at == null ? null : Number(row.imported_at),
  };
}

function usageFromRow(row: UsageRow): MediaAssetUsage {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    organizationId: String(row.organization_id),
    siteId: row.site_id == null ? null : String(row.site_id),
    pageId: row.page_id == null ? null : String(row.page_id),
    sectionId: row.section_id == null ? null : String(row.section_id),
    projectId: row.project_id == null ? null : String(row.project_id),
    sourcePageUrl: row.source_page_url == null ? null : String(row.source_page_url),
    sourceUrl: row.source_url == null ? null : String(row.source_url),
    role: row.role == null ? null : String(row.role),
    altText: row.alt_text == null ? null : String(row.alt_text),
    caption: row.caption == null ? null : String(row.caption),
    metadata: parseJson(row.metadata_json, {}),
    createdAt: Number(row.created_at || 0),
  };
}

export class D1MediaStore {
  constructor(readonly db: MediaD1Database) {}

  async listAssets(filters: MediaAssetListFilters): Promise<MediaAsset[]> {
    const where = ['organization_id=?', "status!='archived'"];
    const binds: unknown[] = [filters.organizationId];
    if (filters.siteId) { where.push('site_id=?'); binds.push(filters.siteId); }
    if (filters.projectId) { where.push('project_id=?'); binds.push(filters.projectId); }
    if (filters.kind) { where.push('media_kind=?'); binds.push(filters.kind); }
    if (filters.source) { where.push('source_kind=?'); binds.push(filters.source); }
    if (filters.query) {
      const q = `%${filters.query.trim().toLowerCase()}%`;
      where.push('(lower(filename) LIKE ? OR lower(COALESCE(alt_text,\'\')) LIKE ? OR lower(tags_json) LIKE ?)');
      binds.push(q, q, q);
    }
    const limit = Math.max(1, Math.min(200, Number(filters.limit || 80)));
    binds.push(limit);
    const rows = await this.db.prepare(`SELECT * FROM media_assets WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`).bind(...binds).all<AssetRow>();
    return (rows.results ?? []).map(assetFromRow);
  }

  async getAsset(id: string, organizationId: string): Promise<MediaAsset | null> {
    const row = await this.db.prepare('SELECT * FROM media_assets WHERE id=? AND organization_id=? LIMIT 1').bind(id, organizationId).first<AssetRow>();
    return row ? assetFromRow(row) : null;
  }

  async findBySha(sha256: string, organizationId: string): Promise<MediaAsset | null> {
    if (!sha256) return null;
    const row = await this.db.prepare('SELECT * FROM media_assets WHERE checksum_sha256=? AND organization_id=? AND status!=\'archived\' LIMIT 1').bind(sha256, organizationId).first<AssetRow>();
    return row ? assetFromRow(row) : null;
  }

  async insertAsset(asset: MediaAsset): Promise<void> {
    await this.db.prepare(`INSERT INTO media_assets (
      id,organization_id,site_id,project_id,source_kind,source_url,canonical_source_id,source_domain,
      bucket,object_key,filename,original_filename,content_type,media_kind,size_bytes,width,height,aspect_ratio,
      orientation,checksum_sha256,etag,alt_text,caption,tags_json,metadata_json,status,created_at,updated_at,imported_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      asset.id, asset.organizationId, asset.siteId ?? null, asset.projectId ?? null,
      asset.source.kind, asset.source.url ?? null, asset.source.canonicalIdentity ?? null, asset.source.domain ?? null,
      asset.storage.bucket, asset.storage.key, asset.filename, asset.originalFilename, asset.mimeType, asset.kind,
      asset.bytes, asset.width ?? null, asset.height ?? null, asset.aspectRatio ?? null, asset.orientation ?? null,
      asset.sha256, asset.storage.etag ?? null, asset.altText ?? null, asset.caption ?? null,
      JSON.stringify(asset.tags), JSON.stringify(asset.metadata), asset.status, asset.createdAt, asset.updatedAt, asset.importedAt ?? null,
    ).run();
  }

  async updateAsset(id: string, organizationId: string, patch: MediaAssetPatch): Promise<MediaAsset | null> {
    const sets: string[] = [];
    const binds: unknown[] = [];
    const add = (column: string, value: unknown) => { sets.push(`${column}=?`); binds.push(value); };
    if ('siteId' in patch) add('site_id', patch.siteId ?? null);
    if ('projectId' in patch) add('project_id', patch.projectId ?? null);
    if ('altText' in patch) add('alt_text', patch.altText ?? null);
    if ('caption' in patch) add('caption', patch.caption ?? null);
    if ('tags' in patch) add('tags_json', JSON.stringify(normalizeTags(patch.tags)));
    if ('status' in patch && patch.status) add('status', patch.status);
    if ('metadata' in patch && patch.metadata) add('metadata_json', JSON.stringify(patch.metadata));
    if (!sets.length) return this.getAsset(id, organizationId);
    add('updated_at', Date.now());
    binds.push(id, organizationId);
    await this.db.prepare(`UPDATE media_assets SET ${sets.join(',')} WHERE id=? AND organization_id=?`).bind(...binds).run();
    return this.getAsset(id, organizationId);
  }

  async deleteAsset(id: string, organizationId: string): Promise<void> {
    await this.db.prepare('DELETE FROM media_assets WHERE id=? AND organization_id=?').bind(id, organizationId).run();
  }

  async listUsages(assetId: string, organizationId: string): Promise<MediaAssetUsage[]> {
    const rows = await this.db.prepare('SELECT * FROM media_asset_usages WHERE asset_id=? AND organization_id=? ORDER BY created_at ASC').bind(assetId, organizationId).all<UsageRow>();
    return (rows.results ?? []).map(usageFromRow);
  }

  async countUsages(assetId: string, organizationId: string): Promise<number> {
    const row = await this.db.prepare('SELECT COUNT(*) AS c FROM media_asset_usages WHERE asset_id=? AND organization_id=?').bind(assetId, organizationId).first<{ c?: number }>();
    return Number(row?.c || 0);
  }

  async insertUsage(usage: MediaAssetUsage): Promise<void> {
    await this.db.prepare(`INSERT INTO media_asset_usages (
      id,asset_id,organization_id,site_id,page_id,section_id,project_id,source_page_url,source_url,role,alt_text,caption,metadata_json,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      usage.id, usage.assetId, usage.organizationId, usage.siteId ?? null, usage.pageId ?? null,
      usage.sectionId ?? null, usage.projectId ?? null, usage.sourcePageUrl ?? null, usage.sourceUrl ?? null,
      usage.role ?? null, usage.altText ?? null, usage.caption ?? null, JSON.stringify(usage.metadata), usage.createdAt,
    ).run();
  }

  async deleteUsage(id: string, organizationId: string): Promise<void> {
    await this.db.prepare('DELETE FROM media_asset_usages WHERE id=? AND organization_id=?').bind(id, organizationId).run();
  }

  async createUsage(assetId: string, organizationId: string, input: MediaUsageInput): Promise<MediaAssetUsage> {
    const usage: MediaAssetUsage = {
      id: `usage_${crypto.randomUUID()}`,
      assetId,
      organizationId,
      siteId: input.siteId ?? null,
      pageId: input.pageId ?? null,
      sectionId: input.sectionId ?? null,
      projectId: input.projectId ?? null,
      sourcePageUrl: input.sourcePageUrl ?? null,
      sourceUrl: input.sourceUrl ?? null,
      role: input.role ?? null,
      altText: input.altText ?? null,
      caption: input.caption ?? null,
      metadata: input.metadata ?? {},
      createdAt: Date.now(),
    };
    await this.insertUsage(usage);
    return usage;
  }
}
