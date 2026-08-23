# AGENTSAM.md — Legendary OS

> SSOT for any agent picking up this project. Read completely before touching bindings, identity, or D1.
> Last updated: 2026-08-23

---

## Identity

```
Agent name:     Agent Sam (Legendary OS worker)
Platform:       Legendary OS — operating layer for Legendary businesses
Operator:       Inner Animal Media (Sam Primeaux) for Legendary Contractors / Legendary Scapes
Organization:   legendary (CMS org scope — not a tenant UUID; see backend auth context)
Brands:         contractors · scapes
Local repo:     /Users/samprimeaux/Legendary-OS
GitHub:         SamPrimeaux/Legendary-OS
Branch:         main
```

**Legendary-owned configuration only.** Do not copy customer import IDs (`client_companions_cpas`, `tenant_companionscpas`, `ws_companionscpas`) or Companions resource names into runtime defaults. Historical CPAS harness material must not live under `iaminfra/` — promote portable patterns into `backend/` with Legendary bindings.

**Do not treat as defaults:** Companions worker names, D1 database names, R2 buckets, domains, or D1 snapshots from any imported source system.

---

## Stack

```
Primary worker:         legendary-os (backend/src/index.ts)
Workers.dev:            https://legendary-os.meauxbility.workers.dev
Custom domains:         (TBD — production DNS)
Frontend:               Vite + React (frontend/) → ASSETS binding
Identity:               @inneranimalmedia/agentsam-sdk (IAM OAuth + local session cookie)
Deploy (Mac):           pnpm deploy  (build + wrangler deploy)
Deploy (CF Builds):     npm run build && npx wrangler deploy --config wrangler.jsonc
```

---

## Worker bindings (verbatim from CF dashboard)

| Type | Name | Value |
|------|------|-------|
| Workers AI | AGENTSAM_WAI | Workers AI Catalog |
| Assets | ASSETS | — |
| R2 bucket | ASSETS_BUCKET | legendary-os |
| KV namespace | CMS_CACHE | CMS_CACHE |
| D1 database | DB | legendary-os-cms |
| Images | IMAGES | — |
| KV namespace | SESSION_CACHE | CMS_CACHE |

**Wrangler IDs (not shown in dashboard Value column):**

- D1 `legendary-os-cms`: `716b1626-4ffb-42d3-8d98-b45a6333f1bf`
- KV `CMS_CACHE` / `SESSION_CACHE`: `22d060ed2a4a4619afcf3a693b2210f4`
- R2 `legendary-os`: bucket name matches binding value

**Worker binding names in code:** `AGENTSAM_WAI` · `ASSETS` · `ASSETS_BUCKET` · `CMS_CACHE` · `DB` · `IMAGES` · `SESSION_CACHE`

**Plain `[vars]` (not bindings):** `CMS_AUTH_MODE` · `IAM_CLIENT_ID` · `IAM_OAUTH_ISSUER`

**Secrets (not bindings):** `AGENTSAM_BRIDGE_KEY` · `IAM_CLIENT_SECRET` · `GOOGLE_CLIENT_*` · `GITHUB_CLIENT_*` · `RESEND_API_KEY`

---

## AGENTSAM_WAI (Workers AI harness)

`env.AGENTSAM_WAI` is the **portable Workers AI binding** for Legendary Agent Sam inference. Design target: a reusable `@legendary-os/agentsam-wai` (or agentsam-sdk subpackage) that CF customers can adopt for a standard Workers AI harness without IAM monolith imports.

**Today:** binding is provisioned on the worker; routing logic lives in `backend/src/agentsam/` (stub). **Not yet:** model catalog sync, D1 `agentsam_routing_arms` parity, or chat tool loop.

**Rule:** use `AGENTSAM_WAI` — not `AI` — so client workers stay aligned with IAM fleet naming (`inneranimalmedia` uses `AI`; Legendary uses `AGENTSAM_WAI`).

---

## AI routing

```
Routing method:     Not wired on Legendary worker yet (future: D1-driven like IAM)
Inference binding:  env.AGENTSAM_WAI (Workers AI catalog)
Platform fallback:  IAM hub via AGENTSAM_BRIDGE_KEY for tool/MCP lanes (separate repo)
```

---

## Non-negotiables

1. **All Legendary OS code changes in this repo only** (`SamPrimeaux/Legendary-OS`). Never patch production from the IAM monolith worker for Legendary features.
2. **Human CMS auth = identity session cookie** (`CMS_AUTH_MODE=agentsam-identity`). Never expose `AGENTSAM_BRIDGE_KEY` to the browser.
3. **Bridge key = machine lane only** (Agent Sam / IAM hub → `Authorization: Bearer` + optional `X-User-Id`).
4. **No hardcoded customer import identity** — resolve org/brand/user from session, D1 membership, or explicit Legendary config vars.
5. **Do not merge or resurrect** `chore/import-companions-agentsam-harness` / `iaminfra/companionscpas-agentsam/` — CPAS-specific harness is out of scope for Legendary.
6. **D1 migrations** run via `wrangler d1 migrations apply` against `migrations/` — see `docs/D1-MIGRATIONS-AUDIT.md`.
7. **Deploy:** `wrangler deploy --config wrangler.jsonc` after `npm run build`. Do not use `wrangler versions upload` alone for production traffic.

---

## CMS pipeline (Legendary)

```
React editor (frontend/src/cms/)
  → /api/cms/* (session cookie)
  → @legendary-os/iam-cms service + D1CmsStore
  → publish → R2 (ASSETS_BUCKET) + KV (CMS_CACHE)
Public site → /api/public/* + ASSETS SPA
```

Org scope: `organization_id = legendary`, brands `contractors` | `scapes`.

---

## Key paths

| Area | Path |
|------|------|
| Worker entry | `backend/src/index.ts` |
| Identity | `backend/src/identity/` |
| CMS API | `backend/src/cms-api.ts` |
| CMS domain | `iaminfra/cms/` (`@legendary-os/iam-cms`) |
| Media | `backend/src/media/` |
| Agent Sam WAI | `backend/src/agentsam/` |
| Auth portal HTML | `app/frontend/auth/` → synced to `frontend/dist/auth/` |
| Wrangler SSOT | `wrangler.jsonc` |

---

## D1 migrations

| Migration | SSOT source |
|-----------|-------------|
| `0001_identity_core.sql` | AgentSam Identity tables |
| `0002_cms_core.sql` | `iaminfra/cms/adapters/cloudflare/schema.sql` |
| `0003_media_core.sql` | `backend/src/media/schema.sql` |
| `0004_agentsam_project_context.sql` | `iaminfra/agentsam/schema.sql` |

Apply: `npx wrangler d1 migrations apply legendary-os-cms --remote -c wrangler.jsonc`

Full audit: `docs/D1-MIGRATIONS-AUDIT.md`

---

## Deploy checklist

1. `pnpm check` or `npm run build` green locally
2. Commit + push `main`
3. `pnpm deploy` (Mac) or CF Builds (`npm run build` + `wrangler deploy`)
4. Confirm `https://legendary-os.meauxbility.workers.dev/api/health`
5. Confirm identity login → `/dashboard/cms` with session (no `invalid_bridge_key`)

---

## Gotchas

- **Duplicate `vars` blocks in wrangler.jsonc** silently override — keep one `vars` object.
- **SESSION_CACHE and CMS_CACHE** share the same KV namespace ID today — intentional until session volume warrants split.
- **Live DB may contain legacy `agentsam_tickets` / `agentsam_tools` rows** from early imports — not in repo migrations; do not seed CPAS tenant IDs into them.
