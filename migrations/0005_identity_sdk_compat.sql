-- Upgrade the existing IAM-compatible identity store for SDK 2.6.12.
-- Preserve user IDs, passwords, provider identities and existing browser sessions.
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
INSERT OR IGNORE INTO accounts(id,email,display_name,status,created_at,updated_at)
SELECT id,email,display_name,status,created_at,updated_at FROM auth_users;

ALTER TABLE auth_sessions ADD COLUMN type TEXT NOT NULL DEFAULT 'browser';

CREATE TABLE IF NOT EXISTS identity_oauth_states (
  state TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  redirect_to TEXT,
  app_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_identity_oauth_states_expiry ON identity_oauth_states(expires_at);
INSERT OR IGNORE INTO identity_oauth_states(state,provider,code_verifier,redirect_to,app_id,expires_at,created_at)
SELECT state,provider,code_verifier,redirect_to,'legendary-os',expires_at,created_at
FROM oauth_states WHERE expires_at > unixepoch();

CREATE TABLE IF NOT EXISTS auth_event_log (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  metadata_json TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_auth_event_log_user ON auth_event_log(user_id,created_at);
