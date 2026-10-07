# Legendary OS: repository map, bindings, and identity readiness

Observed October 6, 2026 America/Chicago. Contractors and Scapes temporarily share this demo; the intended destination is two applications. Worker: `legendary-os`. Public host: `https://legendary-os.meauxbility.workers.dev`.

## Source map

| Path | Responsibility |
|---|---|
| `wrangler.jsonc` | Worker entry, compatibility flags, assets, resource IDs, public configuration |
| `backend/src/index.ts` | Routes identity, CMS, media and public delivery; gates workspace HTML |
| `backend/src/env.ts` | Typed binding and optional credential contract |
| `backend/src/identity/app-config.ts` | Demo app identity, semantic routes, permitted return destinations |
| `backend/src/identity/handle-identity-request.ts` | SDK adapter/router integration and `/api/auth/options` |
| `backend/src/identity/portal-capabilities.ts` | Configuration-derived provider visibility, portal rendering, reset readiness |
| `backend/src/identity/require-dashboard-session.ts` | Session gate for dashboard/CMS/media/leads/projects/team |
| `backend/src/identity/resolve-identity-session.ts` | Resolves human session for APIs |
| `backend/src/auth/` | Human API gate and separate machine bridge authentication |
| `app/frontend/auth/{login,signup,reset}.html` | Auth portal source; copied into build assets, not React pages |
| `app/frontend/shared/company-branding.js` | Applies `/api/company` branding to portal |
| `app/frontend/brand/legendary-mark.svg` | Local portal brand mark |
| `frontend/src/main.tsx` | Public/business and workspace route dispatch; lazy editor imports |
| `frontend/src/site/PublicCmsPage.tsx` | Published CMS page renderer, branded loading, retry |
| `frontend/src/site/{GlobalCmsNav,DemoNavigation}.tsx` | Site header/footer/mobile menu and temporary demo switcher |
| `frontend/src/site/siteLinks.ts` | Brand-scoped URL handling |
| `frontend/index.html` | Branded first paint before React loads |
| `backend/src/public-page-bootstrap.ts` | Embeds published page JSON into initial HTML with HTMLRewriter |
| `backend/src/public-cms-api.ts` | Published page/settings delivery, excludes draft fallbacks |
| `backend/src/cms-api.ts` | CMS HTTP endpoints |
| `backend/src/cms/domain/` | CMS contracts, section registry, validation and editing workflows |
| `backend/src/cms/{application,published-store}.ts` | CMS application and R2/KV publication storage |
| `backend/src/cms/adapters/d1-store.ts` | D1 CMS persistence |
| `frontend/src/cms/` | React CMS editor |
| `backend/src/media/` / `frontend/src/media/` | Media APIs, storage/transforms/usage, library and dedicated asset view |
| `backend/src/agentsam/` | Context schema and future AI harness; no working inference/chat API yet |
| `frontend/public/cad-lab/` | Standalone CAD demo; its AI/CAD API calls are not implemented |
| `content-source/` | Scraper and source corpus; not live page authority |
| `services/` | Architecture notes/placeholders, not independently deployed services |
| `migrations/` | Ordered identity, CMS, media and agent-context D1 migrations |
| `patches/@inneranimalmedia__agentsam-sdk@2.6.12.patch` | Tracked SDK fixes: Worker-safe routes export, host OAuth callback projection, reset-code entropy |
| `scripts/` / `bin/los.mjs` | Build, portal sync, deployment, database migration and operator CLI |
| `tests/` | Foundation and identity regression tests |

`app/frontend/dashboard/index.html` is a legacy static asset; the current workspace is dispatched by `frontend/src/main.tsx`. Leads/projects/team are placeholders. The two public sites do not imply two independently deployed applications yet.

## Routes

| Route | What opens |
|---|---|
| `/` and ordinary public subpaths | Contractors published pages |
| `/scapes/` and `/scapes/*` | Scapes published pages |
| `/site/:siteKey/*` | Explicit CMS site mount |
| `/auth/login`, `/auth/signup`, `/auth/reset` | Branded identity portal |
| `/api/auth/options` | Public boolean readiness; no secrets or account data |
| `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | Local account/session SDK endpoints |
| `/api/oauth/iam/start`, `/api/oauth/iam/callback` | Optional IAM federation and local session establishment |
| `/api/auth/password-reset/request`, `/api/auth/password-reset/confirm` | Local email recovery; unavailable until sender/transport configured |
| `/dashboard/cms` | Current main workspace |
| `/media`, `/media/:id` | Media library and dedicated asset view |
| `/api/cms/*`, `/api/media/*` | Protected management APIs |
| `/api/public/*`, `/assets/*` | Published website data and public assets |

## Cloudflare resources

| Binding | Resource | Purpose |
|---|---|---|
| `DB` | D1 `legendary-os-cms`, ID `716b1626-4ffb-42d3-8d98-b45a6333f1bf` | Identity, CMS, media metadata, agent context |
| `ASSETS` | Worker static assets from `frontend/dist` | Vite bundles, auth portal, brand files |
| `ASSETS_BUCKET` | R2 `legendary-os` | Media originals/derivatives and published CMS snapshots |
| `CMS_CACHE` | KV `22d060ed2a4a4619afcf3a693b2210f4` | Published pointers/settings/cache |
| `SESSION_CACHE` | Same KV namespace as `CMS_CACHE` | OAuth/recovery support; browser sessions themselves are in D1 |
| `IMAGES` | Cloudflare Images binding | Optional image transformation rail |
| `AGENTSAM_WAI` | Workers AI binding | Provisioned; application inference route not implemented |

Plain variables: `CMS_AUTH_MODE=agentsam-identity`, `IAM_CLIENT_ID=iam_identity_21889c4c84ca4de3b4cb`, `IAM_OAUTH_ISSUER=https://inneranimalmedia.com`.

Live secrets observed: `AGENTSAM_BRIDGE_KEY`, `IAM_CLIENT_SECRET`. Google/GitHub credentials and `RESEND_API_KEY` are absent. Secret values were not retrieved. Human login never uses the bridge key.

## Database map

| Migration | Tables / change |
|---|---|
| `0001_identity_core.sql` | `auth_users`, `auth_sessions`, `account_identities`, legacy `oauth_states`, legacy `password_reset_tokens`, `company` |
| `0002_cms_core.sql` | `cms_sites`, `cms_pages`, `cms_sections`, `cms_blocks`, `cms_assets`, `cms_themes`, `cms_global_nav`, `cms_revisions`, `cms_publications`, `cms_section_schemas`, `cms_publish_jobs`, `cms_publish_artifacts` |
| `0003_media_core.sql` | `media_assets`, `media_asset_usages` |
| `0004_agentsam_project_context.sql` | `agentsam_project_context` |
| `0005_identity_sdk_compat.sql` | `accounts`, `identity_oauth_states`, `auth_event_log`; browser session type; existing user/session compatibility |

The installed SDK uses KV-backed password-reset codes; the old `password_reset_tokens` table is not its active reset rail. Existing `oauth_states` is retained for migration compatibility; app-scoped states use `identity_oauth_states`.

## What failed and what is corrected

1. SDK 2.6.12's broad identity export evaluated a Node migration helper during Worker startup. A tracked package export patch lets this app import only route contracts. No desktop migration executed.
2. SDK OAuth emitted `/api/oauth/inneranimalmedia/callback`, while Legendary's live IAM registration allows `/api/oauth/iam/callback` (and its localhost counterpart). The SDK patch now honors this app's semantic callback projection in both authorization and token exchange. The external IAM registration is unchanged.
3. The copied portal displayed Google, GitHub, password reset and backup-code recovery regardless of deployment readiness. Provider controls now derive from configured credentials on the server, before HTML delivery. IAM is an explicit option; Google/GitHub are never silently substituted with IAM. Backup codes are not implemented and are hidden.
4. Local signup/password login work with the supplied migrations. The existing `info@inneranimals.com` Legendary account is IAM-only and has no local password. IAM passwords cannot be typed into Legendary's separate local password form. Federation establishes a local session after authorization.
5. Email reset has handlers but no configured email transport on this deployment. Reset links are withheld, direct reset pages explain availability, and reset endpoints fail clearly rather than claiming mail delivery. No new email service/key was invented and no recovery email was sent during verification.
6. The SDK reset generator used one byte, yielding only 256 possible codes. The tracked patch uses unbiased 32-bit rejection sampling across the full six-digit range, with a regression test. Live reset remains unavailable until mail is configured.

The callback mismatch is verified. A complete signed-in IAM round trip still needs validation with the account owner; a successful authorization redirect alone does not verify token exchange, consent or the user's password.

## What a complete portable identity installation should ship

- A browser-safe runtime entry point and separate Node migration/CLI entry points.
- A host app manifest: app ID, login/signup/reset/callback paths, authenticated destination, adapter profile and branding.
- Versioned schema packs with migrations and a validator; no implicit coupling to an IAM monolith's tables.
- Local signup, password hashing, login, cookie sessions and logout backed by the selected database adapter.
- Injected email delivery for verification/recovery, with explicit sender setup and a working reset evaluation. Email delivery cannot work without an installed transport; it need not be Resend specifically.
- Provider registration with exact callback checks, configured-only UI, return-path validation and tested OAuth round trips.
- Readiness checks that fail installation/deployment for requested-but-unavailable features, rather than a portal with decorative buttons.
- Separate membership/roles from authentication. Legendary still grants broad CMS capabilities to valid sessions; resolve this before private customer/employee data or multi-user use.

This repo now makes its configured UI and callback consistent. It is not a claim that the upstream SDK installer or every identity provider is finished.
