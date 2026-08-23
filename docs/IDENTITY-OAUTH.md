# Identity OAuth connector (Legendary OS)

## Credentials

| Env | Role |
|-----|------|
| `IAM_CLIENT_ID` | `iam_identity_21889c4c84ca4de3b4cb` — plaintext Wrangler var (in `wrangler.jsonc`) |
| `IAM_CLIENT_SECRET` | Minted once at registration — `wrangler secret put` only |
| `IAM_OAUTH_ISSUER` | `https://inneranimalmedia.com` (Wrangler var) |
| `GOOGLE_CLIENT_*` / `GITHUB_CLIENT_*` | Developer BYOK — takes that provider's start button when set |

```bash
# Secret is NOT in git — set once per environment:
npx wrangler secret put IAM_CLIENT_SECRET -c wrangler.jsonc
```

Registered redirect URIs (IAM AS):

- `https://legendary-os.meauxbility.workers.dev/api/oauth/iam/callback`
- `http://localhost:8787/api/oauth/iam/callback` (local dev)

Default Google/GitHub buttons route through IAM when only `IAM_CLIENT_*` are set.
