export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'binary' | 'unknown';
export type MediaSourceKind = 'upload' | 'website_import' | 'r2' | 'cloudflare_images' | 'api';
export type MediaStatus = 'ready' | 'processing' | 'failed' | 'archived';

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
  storage: { provider: 'r2'; bucket: string; key: string; etag?: string | null };
  delivery: { originalUrl: string; publicUrl: string; thumbnailUrl?: string | null };
  source: { kind: MediaSourceKind; url?: string | null; canonicalIdentity?: string | null; domain?: string | null };
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

export type MediaSourceOption = {
  id: 'all' | MediaSourceKind;
  label: string;
  count: number;
};

export type MediaAssetFilters = {
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
