# Identity OAuth connector (Legendary OS)

## Credentials

| Env | Role |
|-----|------|
| `IAM_CLIENT_ID` | Minted client id — plaintext Wrangler var |
| `IAM_CLIENT_SECRET` | Minted secret — `wrangler secret put` only |
| `IAM_OAUTH_ISSUER` | Optional (default `https://inneranimalmedia.com`) |
| `GOOGLE_CLIENT_*` / `GITHUB_CLIENT_*` | Developer BYOK — takes that provider's start button when set |

```bash
npx wrangler secret put IAM_CLIENT_SECRET -c wrangler.jsonc
# register redirect: https://legendary-os.meauxbility.workers.dev/api/oauth/iam/callback
```

Default Google/GitHub buttons route through IAM when only `IAM_CLIENT_*` are set.
