# D1 migrations audit — Legendary OS

Database: **legendary-os-cms** · `716b1626-4ffb-42d3-8d98-b45a6333f1bf`  
Migrations dir: `migrations/` (wrangler `migrations_dir` on `DB` binding)

## Repo migrations (SSOT)

| File | Domain | Upstream SSOT |
|------|--------|---------------|
| `0001_identity_core.sql` | Identity (`auth_*`, `company`, OAuth state) | agentsam-sdk identity core |
| `0002_cms_core.sql` | CMS (`cms_*`) | `backend/src/cms/schema.sql` |
| `0003_media_core.sql` | Media (`media_*`) | `backend/src/media/schema.sql` |
| `0004_agentsam_project_context.sql` | Agent context row store | `backend/src/agentsam/schema.sql` |

All statements are idempotent (`CREATE IF NOT EXISTS`, `INSERT OR IGNORE` where applicable).

## Remote state (2026-08-23)

**All repo migrations applied** via `wrangler d1 migrations apply` (recorded in `d1_migrations`).

**On remote but not in repo migrations (legacy import — do not treat as Legendary defaults):**

| Table | Notes |
|-------|-------|
| `agentsam_tickets` | Legacy ticket spine; no Legendary migration file yet |
| `agentsam_tools` | Tool registry fragment from import |
| `agentsam_error_log` | Ops log fragment from import |

These tables may be replaced or re-migrated under Legendary-owned `0005_*` once ticket/tool schemas are ported into `backend/src/agentsam/`.

## Identity de-confliction

Removed / forbidden in Legendary runtime:

- `client_companions_cpas` / `tenant_companionscpas` / `ws_companionscpas`
- `iaminfra/` staging tree (deleted — CMS domain lives in `backend/src/cms/`)
- Branch `chore/import-companions-agentsam-harness` — **do not merge**
- `SamPrimeaux/companionscpas` as a deployment target for this repo

Legendary CMS auth context uses `organization_id = legendary` and brand IDs `contractors` | `scapes` (see `backend/src/auth/cms-route-auth.ts`).

## Commands

```bash
pnpm los db status
pnpm los db migrate
pnpm los db migrate --local
```

## Schema drift rule

When editing SQL:

1. Update the **domain SSOT** file (`backend/src/cms/schema.sql`, `backend/src/media/schema.sql`, etc.)
2. Add a **new numbered migration** for additive changes — do not edit applied migration files in place.
