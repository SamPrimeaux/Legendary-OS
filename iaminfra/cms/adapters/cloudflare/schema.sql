-- Legendary OS CMS schema
-- Portable CMS semantics live in @legendary-os/iam-cms; D1 is an adapter detail.

CREATE TABLE IF NOT EXISTS cms_sites (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  theme_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_sites_org_brand ON cms_sites(organization_id, brand_id);

CREATE TABLE IF NOT EXISTS cms_pages (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  route TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL CHECK(status IN ('draft','published','archived')) DEFAULT 'draft',
  parent_id TEXT,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_pages_site_route_active ON cms_pages(site_id, route) WHERE status != 'archived';
CREATE INDEX IF NOT EXISTS idx_cms_pages_site ON cms_pages(site_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cms_sections (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK(zone IN ('HEADER','BODY','FOOTER','TEMPLATE')) DEFAULT 'BODY',
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cms_sections_page_order ON cms_sections(page_id, sort_order);

CREATE TABLE IF NOT EXISTS cms_blocks (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES cms_sections(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cms_blocks_section_order ON cms_blocks(section_id, sort_order);

CREATE TABLE IF NOT EXISTS cms_assets (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT NOT NULL DEFAULT '',
  storage_key TEXT NOT NULL,
  labels_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_assets_site_created ON cms_assets(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_themes (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE REFERENCES cms_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tokens_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_global_nav (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE REFERENCES cms_sites(id) ON DELETE CASCADE,
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_global_nav_site ON cms_global_nav(site_id);

CREATE TABLE IF NOT EXISTS cms_revisions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  page_id TEXT REFERENCES cms_pages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('draft','publish','restore')),
  snapshot_json TEXT,
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_revisions_page_created ON cms_revisions(page_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_publications (
  page_id TEXT PRIMARY KEY REFERENCES cms_pages(id) ON DELETE CASCADE,
  tree_json TEXT NOT NULL,
  published_at INTEGER NOT NULL
);

-- D1 mirror of the canonical registry. The TypeScript registry remains the
-- validation SSOT; this mirror lets the editor discover fields dynamically.
CREATE TABLE IF NOT EXISTS cms_section_schemas (
  section_type TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  schema_json TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- Publish audit/receipt tables. R2 remains the immutable artifact store and
-- CMS_CACHE remains the hot pointer; D1 records what was emitted and where.
CREATE TABLE IF NOT EXISTS cms_publish_jobs (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  page_id TEXT REFERENCES cms_pages(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK(job_type IN ('page','global_nav','theme','full_site')),
  status TEXT NOT NULL CHECK(status IN ('pending','running','done','failed')),
  r2_prefix TEXT,
  artifacts_json TEXT NOT NULL DEFAULT '[]',
  error_message TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cms_publish_jobs_site_created ON cms_publish_jobs(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_publish_jobs_page_created ON cms_publish_jobs(page_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_publish_artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES cms_publish_jobs(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  page_id TEXT REFERENCES cms_pages(id) ON DELETE SET NULL,
  section_id TEXT REFERENCES cms_sections(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL CHECK(artifact_type IN ('page','section','global_nav','theme')),
  r2_key TEXT NOT NULL,
  r2_bucket TEXT NOT NULL DEFAULT 'legendary-os',
  content_hash TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_publish_artifacts_job ON cms_publish_artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_cms_publish_artifacts_page_current ON cms_publish_artifacts(page_id, is_current, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_publish_artifacts_site_type_current ON cms_publish_artifacts(site_id, artifact_type, is_current, created_at DESC);
