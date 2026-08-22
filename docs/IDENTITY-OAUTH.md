# Identity OAuth connector (Legendary OS)

First external customer proof for `@inneranimalmedia/agentsam-sdk` identity.

## What shipped

- `app/frontend/` — auth portal (login, signup, reset, company branding)
- `backend/src/identity/` — dispatches to SDK `handleIdentityWorkerRequest`
- `migrations/0001_identity_core.sql` — D1 tables + `company` row for Legendary branding

## OAuth providers

Configure Google + GitHub OAuth apps with callback URLs on your Worker host:

```text
https://<host>/api/oauth/google/callback
https://<host>/api/oauth/github/callback
```

```bash
npx wrangler secret put GOOGLE_CLIENT_ID -c wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_SECRET -c wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_ID -c wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_SECRET -c wrangler.jsonc
```

## D1

```bash
pnpm run db:migrate:identity
```

## Local dev

```bash
pnpm install
pnpm run db:migrate:identity:local
pnpm run dev
# http://localhost:8787/auth/login
```

## Proof checklist

- [ ] `GET /api/company` returns Legendary OS branding
- [ ] Email signup + login
- [ ] Google OAuth round-trip → `/dashboard/cms`
- [ ] GitHub OAuth round-trip → `/dashboard/cms`
- [ ] Logout clears session

See `backend/src/identity/README.md` for route table.
