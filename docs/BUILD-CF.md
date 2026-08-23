# Cloudflare Workers Builds — Legendary OS

SSOT for **Settings → Build** on worker `legendary-os`. If the dashboard disagrees with this file, **update the dashboard to match** (or reconnect the repo so wrangler picks up changes).

## Canonical commands

| Step | Command |
|------|---------|
| Install | *(automatic)* `pnpm install --frozen-lockfile` |
| Build | `npm run build` |
| Deploy | `npx wrangler deploy --config wrangler.jsonc` |

`npm run build` runs: CMS typecheck → Vite → `sync-auth-portal` → backend dry-run.

`pnpm deploy` from repo root is the **Mac/local** equivalent (same assets + worker).

## Do not use (drift sources)

| Wrong | Why |
|-------|-----|
| `pnpm install && pnpm --dir frontend build` only | Skips auth portal sync + backend bundle check |
| `pnpm --dir backend deploy` alone | Skips frontend build + auth HTML copy |
| `npx wrangler versions upload` alone | Uploads a **preview version** — does **not** move production traffic |

Build logs that end with *"To deploy this version to production traffic use wrangler versions deploy"* mean production URL is still on the **previous** version until you promote or use `wrangler deploy`.

## Branch / production

- **Production branch:** `main` (merge `feat/identity-oauth-connector` when ready)
- **Preview alias:** `feat-identity-oauth-connector-legendary-os.meauxbility.workers.dev` (per-branch uploads)

## After dashboard edit

Trigger a manual build and confirm the build detail page shows the same three commands as this doc.
