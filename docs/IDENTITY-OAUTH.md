# Identity OAuth connector (Legendary OS)

First external customer proof for `@inneranimalmedia/agentsam-sdk` identity.

## Credential lanes (SSOT)

| Lane | Env vars | Notes |
|------|----------|-------|
| **IAM platform (default)** | `IAM_CLIENT_ID` + `IAM_CLIENT_SECRET` | Inner Animal Media hosted OAuth — **Wrangler secrets only** |
| BYOK Google | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Only when IAM creds unset |
| BYOK GitHub | `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` | Only when IAM creds unset |

Optional: `IAM_OAUTH_ISSUER` (default `https://inneranimalmedia.com`).

Encryption is law, not luxury — never put `*_CLIENT_SECRET` in `wrangler.jsonc` plaintext.

## Provision IAM platform OAuth

1. Register OAuth client with IAM (`POST https://inneranimalmedia.com/api/oauth/register`) or use platform-provisioned `iam_dcr_*` credentials.
2. Register redirect URI: `https://legendary-os.meauxbility.workers.dev/api/oauth/iam/callback`

```bash
npx wrangler secret put IAM_CLIENT_ID -c wrangler.jsonc
npx wrangler secret put IAM_CLIENT_SECRET -c wrangler.jsonc
# optional staging issuer:
# npx wrangler secret put IAM_OAUTH_ISSUER -c wrangler.jsonc
```

## Optional BYOK (advanced)

Only if you are **not** using IAM platform creds:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID -c wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_SECRET -c wrangler.jsonc
```

## D1

```bash
pnpm run db:migrate:identity
```

## Proof checklist

- [ ] `GET /api/company` → Legendary branding
- [ ] `IAM_CLIENT_*` set → Google/GitHub buttons route through IAM authorize
- [ ] OAuth round-trip → `/dashboard/cms` with session
- [ ] Email signup + login
- [ ] Logout clears session
