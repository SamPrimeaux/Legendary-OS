# Identity + OAuth connector

First customer app on `@inneranimalmedia/agentsam-sdk` identity package.

## Layout

```text
app/frontend/           Auth portal HTML (R2-free — copied into frontend/dist at build)
backend/src/identity/   Worker dispatch into SDK worker-router
migrations/             D1 identity tables + default company row
```

## Routes (SDK)

| Route | Purpose |
|-------|---------|
| `GET /auth/login` | Auth portal |
| `POST /api/auth/login` | Email login |
| `POST /api/auth/signup` | Email signup |
| `GET /api/oauth/google/start` | Google OAuth |
| `GET /api/oauth/github/start` | GitHub OAuth |
| `GET /api/oauth/{provider}/callback` | OAuth callback |
| `GET /api/company` | Branding SSOT |

Post-login default: `/dashboard/cms` (React app shell).

## Secrets (Wrangler)

```bash
npx wrangler secret put GOOGLE_CLIENT_ID -c wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_SECRET -c wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_ID -c wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_SECRET -c wrangler.jsonc
# optional — password reset email
npx wrangler secret put RESEND_API_KEY -c wrangler.jsonc
```

OAuth redirect URIs must include:

- `https://<your-host>/api/oauth/google/callback`
- `https://<your-host>/api/oauth/github/callback`

## D1 migrate

```bash
npx wrangler d1 execute legendary-os-cms --remote --file=migrations/0001_identity_core.sql -c wrangler.jsonc
```

## Proof

```bash
curl -sS https://legendary-os.meauxbility.workers.dev/api/company
open https://legendary-os.meauxbility.workers.dev/auth/login
```
