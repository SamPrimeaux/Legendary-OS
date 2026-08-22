export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'binary' | 'unknown';
export type MediaSourceKind = 'upload' | 'website_import' | 'r2' | 'cloudflare_images' | 'api';
export type MediaStatus = 'ready' | 'processing' | 'failed' | 'archived';

export type MediaStorage = {
  provider: 'r2';
  bucket: string;
  key: string;
  etag?: string | null;
};

export type MediaDelivery = {
  originalUrl: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
};

export type MediaSource = {
  kind: MediaSourceKind;
  url?: string | null;
  canonicalIdentity?: string | null;
  domain?: string | null;
};

export type MediaAsset = {
  id: string;
  organizationId: string;
  siteId?: string | null;
  projectId?: string | null;
  filename: string;
  originalFilename: string;
  mimeType: string;
  kind: MediaKind;
  bytes: number;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  orientation?: number | null;
  sha256: string;
  storage: MediaStorage;
  delivery: MediaDelivery;
  source: MediaSource;
  altText?: string | null;
  caption?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  status: MediaStatus;
  createdAt: number;
  updatedAt: number;
  importedAt?: number | null;
};

export type MediaAssetUsage = {
  id: string;
  assetId: string;
  organizationId: string;
  siteId?: string | null;
  pageId?: string | null;
  sectionId?: string | null;
  projectId?: string | null;
  sourcePageUrl?: string | null;
  sourceUrl?: string | null;
  role?: string | null;
  altText?: string | null;
  caption?: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
};

export type MediaAssetListFilters = {
  organizationId: string;
  siteId?: string;
  projectId?: string;
  kind?: MediaKind;
  source?: MediaSourceKind;
  query?: string;
  limit?: number;
};

export type MediaAssetPatch = {
  siteId?: string | null;
  projectId?: string | null;
  altText?: string | null;
  caption?: string | null;
  tags?: string[];
  status?: MediaStatus;
  metadata?: Record<string, unknown>;
};

export type MediaUsageInput = Omit<MediaAssetUsage, 'id' | 'organizationId' | 'createdAt' | 'metadata'> & {
  metadata?: Record<string, unknown>;
};

export type ExistingR2AssetInput = {
  organizationId: string;
  siteId?: string | null;
  projectId?: string | null;
  objectKey: string;
  bucket: string;
  filename?: string;
  mimeType?: string;
  bytes?: number;
  sha256?: string;
  sourceUrl?: string | null;
  canonicalSourceIdentity?: string | null;
  sourceKind?: MediaSourceKind;
  altText?: string | null;
  caption?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  importedAt?: number | null;
};

export type NormalizedManifestAsset = {
  target?: string | null;
  siteId?: string | null;
  sourcePageUrl?: string | null;
  sourceUrl?: string | null;
  canonicalSourceIdentity?: string | null;
  r2Key: string;
  bucket?: string | null;
  filename?: string | null;
  contentType?: string | null;
  bytes?: number | null;
  sha256?: string | null;
  altText?: string | null;
  caption?: string | null;
  tags?: string[];
};

export type NormalizedManifestUsage = {
  target?: string | null;
  assetSourceUrl?: string | null;
  assetSha256?: string | null;
  sourcePageUrl?: string | null;
  pageId?: string | null;
  sectionId?: string | null;
  projectId?: string | null;
  role?: string | null;
  altText?: string | null;
  caption?: string | null;
};

export type NormalizedSiteIngestManifest = {
  bucket?: string | null;
  assets: NormalizedManifestAsset[];
  usages: NormalizedManifestUsage[];
};

export function normalizeTags(input: unknown): string[] {
  const values = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  return [...new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, 40);
}

export function mediaKindFor(mimeType: string, filename = ''): MediaKind {
  const mime = mimeType.toLowerCase();
  const name = filename.toLowerCase();
  if (mime.startsWith('image/') || /\.(avif|webp|jpe?g|png|gif|svg)$/.test(name)) return 'image';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/.test(name)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/.test(name)) return 'audio';
  if (mime === 'application/pdf' || /\.(pdf|docx?|xlsx?|pptx?|txt|md)$/.test(name)) return 'document';
  if (mime && mime !== 'application/octet-stream') return 'binary';
  return 'unknown';
}
