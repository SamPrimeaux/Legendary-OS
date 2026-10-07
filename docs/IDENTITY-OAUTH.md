# Identity OAuth connector (Legendary OS)

## Credentials

| Env | Role |
|-----|------|
| `IAM_CLIENT_ID` | `iam_identity_21889c4c84ca4de3b4cb` — plaintext Wrangler var (in `wrangler.jsonc`) |
| `IAM_CLIENT_SECRET` | Minted once at registration — `wrangler secret put` only |
| `IAM_OAUTH_ISSUER` | `https://inneranimalmedia.com` (Wrangler var) |
| `GOOGLE_CLIENT_*` / `GITHUB_CLIENT_*` | Developer BYOK — takes that provider's start button when set |

```bash
# From inneranimalmedia (mints iamcs_*, updates IAM D1 hash, wrangler put on Legendary):
npm run sync:identity-oauth-secret -- --save-env

# Or manual wrangler only (you must already have the iamcs_* plaintext):
npx wrangler secret put IAM_CLIENT_SECRET -c wrangler.jsonc
```

The plaintext `iamcs_*` is shown **once** at `POST /api/oauth/identity/register` — D1 stores only
`oauth_clients.client_secret_hash` (not `user_api_keys`). If you lost it, run `sync:identity-oauth-secret`
to rotate; do not re-register unless you want a new `client_id`.

Registered redirect URIs (IAM AS):

- `https://legendary-os.meauxbility.workers.dev/api/oauth/iam/callback`
- `http://localhost:8787/api/oauth/iam/callback` (local dev)

SDK 2.6.12 keeps providers explicit: Google/GitHub do not fall back to IAM. The portal is rendered from live credential readiness and offers **Continue with Inner Animal Media** when IAM is configured. Unconfigured Google/GitHub and backup-code controls are hidden.

The app callback projection is `/api/oauth/iam/callback`, matching the live registration above. A tracked SDK patch makes IAM authorization and token exchange honor that projection instead of assuming `/api/oauth/inneranimalmedia/callback`.

Local email/password signup and sessions use the Legendary D1 store. IAM-only accounts have no local password. Local email recovery additionally needs `RESEND_API_KEY` and a verified company support sender; recovery is withheld when that setup is absent. Never use a platform password in the local app password form or invent a shared demo password.

Current source/resource map and portable installation requirements: [REPO-MAP-AND-IDENTITY-2026-10-07.md](REPO-MAP-AND-IDENTITY-2026-10-07.md).
