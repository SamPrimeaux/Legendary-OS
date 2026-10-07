-- 0001_baseline.sql
-- Schema only. No data, no tenant identifiers, no seeds. See docs/DATA-AND-MIGRATIONS.md.
-- Rows are keyed by stable slugs/keys so seeds and edits are idempotent.

CREATE TABLE sites (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  theme_json TEXT NOT NULL DEFAULT '{}',
  brand_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE globals (
  site_key TEXT PRIMARY KEY REFERENCES sites(key) ON DELETE CASCADE,
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pages (
  site_key TEXT NOT NULL REFERENCES sites(key) ON DELETE CASCADE,
  key TEXT NOT NULL,
  route TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  template TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_key, key),
  UNIQUE (site_key, route)
);

CREATE TABLE page_aliases (
  site_key TEXT NOT NULL,
  alias TEXT NOT NULL,
  page_key TEXT NOT NULL,
  PRIMARY KEY (site_key, alias),
  FOREIGN KEY (site_key, page_key) REFERENCES pages(site_key, key) ON DELETE CASCADE
);

CREATE TABLE sections (
  site_key TEXT NOT NULL,
  page_key TEXT NOT NULL,
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  preset TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}',
  data_json TEXT NOT NULL DEFAULT '{}',
  blocks_json TEXT NOT NULL DEFAULT '[]',
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_key, page_key, key),
  FOREIGN KEY (site_key, page_key) REFERENCES pages(site_key, key) ON DELETE CASCADE
);
CREATE INDEX idx_sections_page ON sections(site_key, page_key, sort_order);

CREATE TABLE collection_items (
  site_key TEXT NOT NULL REFERENCES sites(key) ON DELETE CASCADE,
  collection TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_key, collection, slug)
);
CREATE INDEX idx_collection_items_list ON collection_items(site_key, collection, status, sort_order);

CREATE TABLE media_assets (
  site_key TEXT NOT NULL REFERENCES sites(key) ON DELETE CASCADE,
  key TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  storage_key TEXT NOT NULL,
  checksum_sha256 TEXT,
  labels_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_key, key),
  UNIQUE (site_key, checksum_sha256)
);

CREATE TABLE media_usages (
  site_key TEXT NOT NULL,
  media_key TEXT NOT NULL,
  ref_kind TEXT NOT NULL CHECK (ref_kind IN ('page', 'collection', 'globals', 'project')),
  ref_key TEXT NOT NULL,
  field TEXT NOT NULL,
  PRIMARY KEY (site_key, media_key, ref_kind, ref_key, field),
  FOREIGN KEY (site_key, media_key) REFERENCES media_assets(site_key, key) ON DELETE CASCADE
);

CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  site_key TEXT NOT NULL REFERENCES sites(key) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('page', 'globals', 'collection')),
  scope_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('draft', 'publish', 'restore')),
  snapshot_json TEXT NOT NULL,
  actor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_revisions_scope ON revisions(site_key, scope, scope_key, created_at DESC);

-- The public Worker reads ONLY this table: one primary-key lookup per page/globals/collection.
CREATE TABLE publications (
  site_key TEXT NOT NULL REFERENCES sites(key) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('page', 'globals', 'collection')),
  scope_key TEXT NOT NULL,
  revision_id TEXT REFERENCES revisions(id),
  snapshot_json TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_key, scope, scope_key)
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('inneranimalmedia')),
  subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'crew', 'viewer')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provider, subject)
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  site_key TEXT NOT NULL REFERENCES sites(key) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,
  data_json TEXT NOT NULL DEFAULT '{}',
  source_route TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'won', 'lost')),
  assigned_to TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_leads_inbox ON leads(site_key, status, created_at DESC);

CREATE TABLE projects (
  site_key TEXT NOT NULL REFERENCES sites(key) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('lead', 'planned', 'active', 'complete', 'archived')),
  address TEXT,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  portfolio_slug TEXT,
  started_on TEXT,
  completed_on TEXT,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_key, key)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  site_key TEXT NOT NULL,
  project_key TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  assigned_to TEXT REFERENCES members(id) ON DELETE SET NULL,
  due_on TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (site_key, project_key) REFERENCES projects(site_key, key) ON DELETE CASCADE
);
CREATE INDEX idx_tasks_project ON tasks(site_key, project_key, status, sort_order);

CREATE TABLE project_media (
  site_key TEXT NOT NULL,
  project_key TEXT NOT NULL,
  media_key TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('sketch', 'before', 'progress', 'after', 'final')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_key, project_key, media_key),
  FOREIGN KEY (site_key, project_key) REFERENCES projects(site_key, key) ON DELETE CASCADE,
  FOREIGN KEY (site_key, media_key) REFERENCES media_assets(site_key, key) ON DELETE CASCADE
);
