# AGENTS.md — rules for any human or agent working in `platform/`

`platform/` is the **refined** system. The repo root (`backend/`, `frontend/`, `migrations/`,
`wrangler.jsonc`, `app/`, `bin/`, `scripts/`, `services/`) is the **live** system. Our job is to refine
what exists, area by area, without regressing it. Rules are enforced by `npm run verify`.

## Protect the live system
1. **Live is read-only from this branch.** Never edit `backend/`, `frontend/`, `migrations/`,
   `wrangler.jsonc` or `app/` as part of platform work. Fixes to live code go in their own PRs.
2. **Never apply `platform/packages/platform-db` to the live D1.** Its tables collide with live ones
   (`media_assets`). The baseline is for fresh installs only. Run `npm run schema-diff` before touching schema.
3. **Never regress a converted page.** Every converted page must pass `npm run parity` (live text,
   section counts, legacy URLs) and `npm run build:demo` (every internal link resolves).
4. **`import-live` is a one-time bridge.** It overwrites hand edits. After a page is polished, edit its
   `content/site.json` directly; never re-import it.
5. **One deployment, many sites** (one Worker, one D1, one R2). Do not create per-site workers or
   databases for the demo. Isolation for a paying customer = adding a new file under `deployments/`.
6. **Nothing here deploys yet.** The live worker still runs `backend/src/index.ts`. Cutover is a
   separate, reviewed PR (see MIGRATION.md).

## Keep it white-label and clean
7. **No customer branding in `packages/**` or `tools/**`** (names, domains, phones, copy, colors).
   They live in `apps/<id>/`. `tools/guard.mjs` fails the build otherwise.
8. **Apps contain no logic.** An app = manifest + brand + tokens + content. Behavior is in a package.
9. **Contracts are the single source of truth** (`packages/site-contracts`). Change the contract first.
10. **New section/collection types** are added once: `cms-core/src/builtin.ts` (editor fields) and
    `site-renderer/src/sections.ts` (markup), with a parity-safe default. Never one-off in a site.
11. **Content lives in the database.** Seeds are install input only; rows use stable keys, never
    hardcoded numeric IDs. Seeds are insert-only by default so edits survive.
12. **Migrations are schema-only and forward-only.** No INSERT/UPDATE/DELETE, no tenant data. Released
    files are immutable (`migrations.lock.json`).
13. **One config source:** manifests and `deployment.json`. No env-var overrides; secrets via
    `wrangler secret` only.
14. **Identity provider value is the full word `inneranimalmedia`** in new identifiers, provider
    values and CHECK enums. (Legacy names like `IAM_*` vars exist in live config; do not copy them.)
15. **No backup copies** (`.bak`, `*-old`, backup folders). Git is the backup.
16. **Done means `npm run verify` passes.**
