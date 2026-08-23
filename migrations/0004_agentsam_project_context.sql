-- Legendary OS Agent Sam project context (SSOT: backend/src/agentsam/schema.sql)
-- tenant_id / workspace_id are runtime-bound — never hardcode customer imports.

CREATE TABLE IF NOT EXISTS agentsam_project_context (
  id TEXT PRIMARY KEY DEFAULT ('ctx_' || lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL,
  workspace_id TEXT,
  project_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT,
  status TEXT DEFAULT 'active',
  priority INTEGER DEFAULT 50,
  description TEXT NOT NULL,
  goals TEXT,
  constraints TEXT,
  current_blockers TEXT,
  primary_tables TEXT,
  secondary_tables TEXT,
  workers_involved TEXT,
  r2_buckets_involved TEXT,
  domains_involved TEXT,
  mcp_services_involved TEXT,
  key_files TEXT,
  related_routes TEXT,
  tokens_budgeted INTEGER,
  tokens_used INTEGER DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  linked_ticket_id TEXT,
  client_id TEXT,
  created_by TEXT,
  started_at INTEGER,
  target_completion INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_agentsam_project_context_project
  ON agentsam_project_context(tenant_id, project_key);

CREATE INDEX IF NOT EXISTS idx_agentsam_project_context_ticket
  ON agentsam_project_context(linked_ticket_id);

CREATE INDEX IF NOT EXISTS idx_agentsam_project_context_status
  ON agentsam_project_context(status, priority DESC);
