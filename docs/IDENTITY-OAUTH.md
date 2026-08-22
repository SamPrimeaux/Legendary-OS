# Identity OAuth connector (Legendary OS)

First external customer proof for `@inneranimalmedia/agentsam-sdk` identity.

## Required credentials

| Env var | Role |
|---------|------|
| `IAM_CLIENT_ID` | OAuth client id minted for this worker |
| `IAM_CLIENT_SECRET` | OAuth client secret |

Optional: `IAM_OAUTH_ISSUER` (default `https://inneranimalmedia.com`).

Encryption is law, not luxury — **Wrangler secrets only**; never plaintext in `wrangler.jsonc`.

## Provision

1. Register OAuth client with IAM (`POST https://inneranimalmedia.com/api/oauth/register`) or use platform-minted `iam_dcr_*` credentials.
2. Register redirect URI: `https://legendary-os.meauxbility.workers.dev/api/oauth/iam/callback`

```bash
npx wrangler secret put IAM_CLIENT_ID -c wrangler.jsonc
npx wrangler secret put IAM_CLIENT_SECRET -c wrangler.jsonc
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
