-- Legendary OS media substrate (SSOT: backend/src/media/schema.sql)

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  site_id TEXT,
  project_id TEXT,
  source_kind TEXT NOT NULL DEFAULT 'r2',
  source_url TEXT,
  canonical_source_id TEXT,
  source_domain TEXT,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  media_kind TEXT NOT NULL DEFAULT 'unknown',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  aspect_ratio REAL,
  orientation INTEGER,
  checksum_sha256 TEXT NOT NULL,
  etag TEXT,
  alt_text TEXT,
  caption TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ready',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  imported_at INTEGER,
  CHECK (source_kind IN ('upload','website_import','r2','cloudflare_images','api')),
  CHECK (media_kind IN ('image','video','audio','document','binary','unknown')),
  CHECK (status IN ('ready','processing','failed','archived')),
  UNIQUE (organization_id, checksum_sha256),
  UNIQUE (bucket, object_key)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_org_created ON media_assets(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_site_created ON media_assets(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_project_created ON media_assets(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_kind_source ON media_assets(media_kind, source_kind);
CREATE INDEX IF NOT EXISTS idx_media_assets_canonical_source ON media_assets(canonical_source_id);

CREATE TABLE IF NOT EXISTS media_asset_usages (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  site_id TEXT,
  page_id TEXT,
  section_id TEXT,
  project_id TEXT,
  source_page_url TEXT,
  source_url TEXT,
  role TEXT,
  alt_text TEXT,
  caption TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_usage_asset ON media_asset_usages(asset_id, created_at);
CREATE INDEX IF NOT EXISTS idx_media_usage_site_page ON media_asset_usages(site_id, page_id);
CREATE INDEX IF NOT EXISTS idx_media_usage_project ON media_asset_usages(project_id);
