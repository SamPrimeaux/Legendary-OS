# Backend auth

Authentication and machine-to-machine trust for the Legendary OS Worker.

## Env type (SSOT)

Declare **only** one machine-auth secret on Worker env:

```ts
AGENTSAM_BRIDGE_KEY?: string;
```

Do not add `INTERNAL_API_SECRET`, `IAM_SERVICE_KEY`, etc. — that is fleet
sprawl. IAM sends the same bridge value via `Authorization: Bearer` and legacy
header aliases; verify reads `env.AGENTSAM_BRIDGE_KEY` only.

## Layout

```text
backend/src/auth/
├── machine-auth-env.ts   # MachineAuthEnv + configured secret list
├── bridge-key-auth.ts    # verifyBridgeKey (inbound, IAM platform SSOT)
└── cms-route-auth.ts     # /api/cms/* gate + CmsRequestContext from bridge headers
```

Worker `Env` is defined once in `backend/src/env.ts`.

## CMS bridge (IAM hub)

When `AGENTSAM_BRIDGE_KEY` is provisioned on the Worker:

1. `rejectUnauthorizedCmsApi` requires `verifyBridgeKey` **or** `Cf-Access-Authenticated-User-Email` (direct Zero Trust).
2. Bridge-authenticated requests build actor context from IAM headers:
   - `X-User-Id` (required for audit; falls back to `iam_bridge`)
   - `X-Tenant-Id`, `X-Workspace-Id`, `X-Project-Slug` — reserved for future membership checks

IAM sends bridge via `Authorization: Bearer` (`inneranimalmedia` `cms-bridge-trust.js`).

## Public routes (no bridge)

- `GET /api/health`
- `/api/public/*` (published site reads)
- Static assets via `ASSETS` binding

## Provision secret

From Mac SSOT (same value as `inneranimalmedia`):

```bash
cd ~/inneranimalmedia
./scripts/sync-bridge-key-fleet.sh --sync-only
```

Or manually:

```bash
./scripts/with-cloudflare-env.sh npx wrangler secret put AGENTSAM_BRIDGE_KEY -c ~/Legendary-OS/wrangler.jsonc
```

## Proof

```bash
# Without bridge → 401 when secret is provisioned
curl -sS https://legendary-os.meauxbility.workers.dev/api/cms/sites

# With bridge (from .env.cloudflare)
curl -sS https://legendary-os.meauxbility.workers.dev/api/cms/sites \
  -H "Authorization: Bearer $AGENTSAM_BRIDGE_KEY" \
  -H "X-User-Id: au_operator"
```
