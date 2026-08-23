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

Default Google/GitHub buttons route through IAM when only `IAM_CLIENT_*` are set.
